"""Defined-risk structure backtest on real Theta Data EOD quotes. See README for rules."""
import os, glob, json, numpy as np, pandas as pd
from fetch import UNIVERSE
ETFS={"SPY","QQQ","IWM","DIA","GLD","TLT","XLF"}
FEE=0.65; MULT=100; MAX_SPREAD_FRAC=0.60
BUCKETS={"7d":(5,10,7),"30d":(25,35,30),"45d":(40,50,45)}
# legs: (right, offset in expected-move units m, qty: +long/-short)
STRUCT={
 "put_credit_spread":   [("P",-0.5,-1),("P",-1.0,+1)],
 "call_credit_spread":  [("C",+0.5,-1),("C",+1.0,+1)],
 "bull_call_debit":     [("C",0.0,+1),("C",+0.5,-1)],
 "bear_put_debit":      [("P",0.0,+1),("P",-0.5,-1)],
 "iron_condor":         [("P",-0.5,-1),("P",-1.0,+1),("C",+0.5,-1),("C",+1.0,+1)],
 "long_call_butterfly": [("C",-0.5,+1),("C",0.0,-2),("C",+0.5,+1)],
 "short_iron_butterfly":[("P",0.0,-1),("C",0.0,-1),("P",-1.0,+1),("C",+1.0,+1)],
}
def payoff(r,K,S): return max(S-K,0) if r=="C" else max(K-S,0)
def run():
    rows=[]; skips={}
    def skip(k): skips[k]=skips.get(k,0)+1
    for s in UNIVERSE:
        st=pd.read_parquet(f"cache/stock/{s}.parquet"); st["date"]=pd.to_datetime(st["date"]).dt.date
        st=st[st.close>0].reset_index(drop=True)
        st["rv20"]=np.log(st.close).diff().rolling(20).std()*np.sqrt(252)
        st["jump"]=np.log(st.close).diff().abs()>np.log(1.5)  # split/data break flag
        idx={d:i for i,d in enumerate(st.date)}
        for f in sorted(glob.glob(f"cache/opt/{s}_*.parquet")):
            d=pd.to_datetime(f[-16:-8]).date()
            if d not in idx: continue
            i=idx[d]; S=st.close[i]; sig=st.rv20[i]
            if not np.isfinite(sig): skip("no_rv"); continue
            ch=pd.read_parquet(f)
            if ch.empty: skip("empty_chain"); continue
            ch["expiration"]=pd.to_datetime(ch.expiration).dt.date
            ch["right"]=ch.right.str[0]
            exps=sorted(ch.expiration.unique())
            for b,(lo,hi,tgt) in BUCKETS.items():
                cand=[e for e in exps if lo<=(e-d).days<=hi]
                if not cand: skip(f"no_exp_{b}"); continue
                e=min(cand,key=lambda x:abs((x-d).days-tgt))
                if e not in idx: skip("exp_not_trading_day"); continue
                j=idx[e]
                if st.jump[i+1:j+1].any(): skip("split_or_break_in_window"); continue
                ST=st.close[j]; dte=(e-d).days
                m=S*sig*np.sqrt(dte/365)
                ce=ch[ch.expiration==e]
                for name,legs in STRUCT.items():
                    fills=[]; ok=True; used=set()
                    for r,off,q in legs:
                        sub=ce[ce.right==r]
                        if sub.empty: ok=False; break
                        K=sub.strike.iloc[(sub.strike-(S+off*m)).abs().argmin()]
                        q_=sub[sub.strike==K].iloc[0]
                        bid,ask=q_.bid,q_.ask; mid=(bid+ask)/2
                        if bid<=0 or ask<=0 or ask<bid or (ask-bid)>MAX_SPREAD_FRAC*mid: ok=False; break
                        fills.append((r,K,q,bid,ask))
                    if not ok: skip("dead_quote"); continue
                    # distinct strikes per right required (wings must differ)
                    ks=[(r,K) for r,K,q,_,_ in fills]
                    if len(set(ks))<len({(r,o) for r,o,_ in legs}): skip("degenerate_strikes"); continue
                    entry=sum((a if q>0 else bb)*q for r,K,q,bb,a in fills)  # cash paid per share (neg=credit)
                    fees=FEE*sum(abs(q) for r,K,q,_,_ in fills)
                    settle=sum(q*payoff(r,K,ST) for r,K,q,_,_ in fills)
                    pnl=(settle-entry)*MULT-fees
                    # max loss: evaluate payoff over strikes grid + extremes
                    grid=sorted({K for _,K,_,_,_ in fills}|{0.0,S*10})
                    vals=[(sum(q*payoff(r,K,x) for r,K,q,_,_ in fills)-entry)*MULT-fees for x in grid]
                    maxloss=-min(vals)
                    if maxloss<=0: skip("arb_or_nonpositive_risk"); continue
                    rows.append(dict(ticker=s,cls="ETF" if s in ETFS else "stock",entry=d,expiry=e,dte=dte,bucket=b,
                        structure=name,S=S,ST=ST,rv20=sig,entry_cash=entry,fees=fees,pnl=pnl,max_loss=maxloss,ror=pnl/maxloss))
    return pd.DataFrame(rows), skips
def block_boot_lcb(df,col,n=2000,seed=0):
    rng=np.random.default_rng(seed)
    wk=df.groupby(df.entry.map(lambda x:x.isocalendar()[:2]))[col].agg(["sum","count"]).values
    k=len(wk); out=[]
    for _ in range(n):
        smp=wk[rng.integers(0,k,k)]; out.append(smp[:,0].sum()/smp[:,1].sum())
    return float(np.percentile(out,5)), float(np.percentile(out,95))
def evaluate(df):
    res=[]
    groups=[("ALL",df)]+[(c,df[df.cls==c]) for c in ["ETF","stock"]]
    for gname,g in groups:
        for (st,b),x in g.groupby(["structure","bucket"]):
            x=x.sort_values("entry"); n=len(x)
            ev=x.pnl.mean(); q=x.pnl.quantile(0.05); es=-x.pnl[x.pnl<=q].mean()
            util=ev-1.0*es
            lcb,ucb=block_boot_lcb(x,"pnl")
            dates=sorted(x.entry.unique()); cut=dates[int(len(dates)*2/3)]
            emb=pd.Timestamp(cut)-pd.Timedelta(weeks=7)
            tr=x[pd.to_datetime(x.entry)<emb]; te=x[pd.to_datetime(x.entry)>=pd.Timestamp(cut)]
            crit=dict(n_ge_200=n>=200, ev_pos=ev>0, ev_lcb90_pos=lcb>0, utility_pos=util>0,
                      wf_train_pos=tr.pnl.mean()>0, wf_test_pos=te.pnl.mean()>0)
            res.append(dict(group=gname,structure=st,bucket=b,n=n,tickers=x.ticker.nunique(),
                ev_usd=ev,ev_lcb5_usd=lcb,ev_ucb95_usd=ucb,median_usd=x.pnl.median(),pop=(x.pnl>0).mean(),
                es95_usd=es,utility_usd=util,mean_ror=x.ror.mean(),avg_max_loss=x.max_loss.mean(),
                total_pnl=x.pnl.sum(),wf_train_ev=tr.pnl.mean(),wf_test_ev=te.pnl.mean(),
                promoted=all(crit.values()),failed=",".join(k for k,v in crit.items() if not v)))
    return pd.DataFrame(res)
if __name__=="__main__":
    os.makedirs("results",exist_ok=True)
    df,sk=run(); df.to_csv("results/trades.csv.gz",index=False)
    ev=evaluate(df); ev.to_csv("results/evaluation.csv",index=False)
    json.dump(dict(skips=sk,n_trades=len(df),date_min=str(df.entry.min()),date_max=str(df.expiry.max())),open("results/run_meta.json","w"),indent=1)
    pd.set_option("display.width",250)
    print(ev.round(2).to_string())
    print(sk)
