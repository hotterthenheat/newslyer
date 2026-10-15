"""Pull real Theta Data EOD data: stock EOD history + weekly option-chain EOD snapshots (<=50 DTE).
Auth: THETADATA_API_KEY from env (never stored in repo)."""
import os, sys, time, pandas as pd
from datetime import date
from concurrent.futures import ThreadPoolExecutor, as_completed
from thetadata import ThetaClient
UNIVERSE = ["SPY","QQQ","IWM","DIA","GLD","TLT","XLF","AAPL","MSFT","NVDA","AMZN","META","GOOGL","TSLA","AMD","AVGO","NFLX","JPM","BAC","XOM"]
START, END = date(2023,1,3), date(2026,9,4)
D = "cache"; os.makedirs(f"{D}/stock", exist_ok=True); os.makedirs(f"{D}/opt", exist_ok=True)
import threading, io, requests
REST="http://127.0.0.1:25503/v3"  # shared Theta Terminal (do not start another)
_lk=threading.Lock(); _c=[None]
def call(name,**kw):
    for k in range(6):
        cl=_c[0]
        try: return getattr(cl,name)(**kw)
        except Exception as e:
            err=e
            if "UNAUTH" in str(e) or "session" in str(e).lower():
                with _lk:
                    if _c[0] is cl:
                        time.sleep(3); _c[0]=ThetaClient(dataframe_type="pandas")
            else: time.sleep(3*(k+1))
    raise err
def stock(s):
    p=f"{D}/stock/{s}.parquet"
    if os.path.exists(p): return pd.read_parquet(p)
    parts=[]
    for y in range(2022,2027):
        a=date(y,1,1); b=min(date(y,12,31), date(2026,10,14))
        parts.append(call("stock_history_eod",symbol=s,start_date=a,end_date=b))
    df=pd.concat(parts); df["date"]=pd.to_datetime(df["created"].astype(str).str[:10]).dt.date
    df=df[["date","open","high","low","close","volume"]].drop_duplicates("date").sort_values("date")
    df.to_parquet(p); return df
def opt(s,d):
    p=f"{D}/opt/{s}_{d:%Y%m%d}.parquet"
    if os.path.exists(p): return
    for k in range(8):
        try:
            u=f"{REST}/option/history/eod?symbol={s}&expiration=*&start_date={d:%Y%m%d}&end_date={d:%Y%m%d}&max_dte=50&strike_range=40&format=csv"
            r=requests.get(u,timeout=120)
            if r.status_code==472: df=pd.DataFrame(columns=["symbol","expiration","strike","right","bid","ask","bid_size","ask_size","volume","close"])
            else:
                r.raise_for_status(); df=pd.read_csv(io.StringIO(r.text))
            df=df[["symbol","expiration","strike","right","bid","ask","bid_size","ask_size","volume","close"]]
            df.to_parquet(p); return
        except Exception as e:
            err=e; time.sleep(15*(k+1))
    print("FAIL",s,d,str(err)[:120],flush=True)
if __name__=="__main__":
    jobs=[]
    for s in UNIVERSE:
        st=stock(s); days=[x for x in st["date"] if START<=x<=END]
        wk={}
        for x in days: wk.setdefault(x.isocalendar()[:2],x)   # first trading day of each ISO week
        jobs+= [(s,x) for x in wk.values()]
        print(s,len(wk),flush=True)
    print("jobs",len(jobs),flush=True)
    n=0
    with ThreadPoolExecutor(int(sys.argv[1]) if len(sys.argv)>1 else 2) as ex:
        for f in as_completed([ex.submit(opt,*j) for j in jobs]):
            n+=1
            if n%100==0: print("done",n,flush=True)
