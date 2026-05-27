import { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const C = {
  navy:"#0B1437", navyMid:"#112060", blue:"#2563EB", blueLight:"#EFF6FF",
  blueBorder:"#BFDBFE", danger:"#EF4444", dangerBg:"#FEF2F2",
  dangerBorder:"#FECACA", success:"#22C55E", successBg:"#F0FDF4",
  successBorder:"#BBF7D0", amber:"#F59E0B", amberBg:"#FEFCE8",
  amberBorder:"#FDE68A", purple:"#8B5CF6", purpleBg:"#F5F3FF",
  purpleBorder:"#DDD6FE", text:"#0F172A", textSub:"#64748B",
  border:"#E2E8F0", surface:"#F8FAFC", white:"#FFFFFF",
};

const CHART_COLORS = [
  "#2563EB","#22C55E","#F59E0B","#EF4444","#8B5CF6",
  "#06B6D4","#F97316","#EC4899","#10B981","#6366F1",
];

// ── Mock data ─────────────────────────────────────────────────────────────────
function buildMock() {
  const rows = []; const cats=["Grocery","Beverages","Snacks","Home Care","Personal Care"]; const chs=["Online","Offline","Omnichannel"];
  for(let i=0;i<60;i++){
    const d=new Date("2024-05-01"); d.setDate(d.getDate()+i);
    const demand=Math.max(0,950+Math.sin(i/5)*220+Math.random()*180), stock=800+Math.random()*700;
    rows.push({ ds:d.toISOString().split("T")[0], Predicted_Demand:+demand.toFixed(2), Stock:+stock.toFixed(2),
      Risk:demand>stock?"High":"Low", Avg_Revenue:+(200+Math.random()*100).toFixed(2),
      Avg_Margin_Pct:+(0.15+Math.random()*0.1).toFixed(4), Dominant_Category:cats[i%cats.length],
      Dominant_Channel:chs[i%chs.length], Avg_Lead_Time:+(5+Math.random()*10).toFixed(1),
      Avg_Customer_Age:+(28+Math.random()*12).toFixed(1), Loyalty_Rate:+(0.5+Math.random()*0.3).toFixed(4),
      High_Risk_Reorder_Flag:+(Math.random()*0.4).toFixed(4) });
  }
  return rows;
}
const MOCK_FORECAST = buildMock();
const MOCK_SUMMARY = {
  total_demand: MOCK_FORECAST.reduce((s,r)=>s+r.Predicted_Demand,0).toFixed(2),
  high_risk_days: MOCK_FORECAST.filter(r=>r.Risk==="High").length,
  low_risk_days: MOCK_FORECAST.filter(r=>r.Risk==="Low").length,
  avg_demand_per_day: +(MOCK_FORECAST.reduce((s,r)=>s+r.Predicted_Demand,0)/MOCK_FORECAST.length).toFixed(2),
  avg_stock: 1100, avg_margin_pct:15.4, avg_lead_time_days:8.2,
  avg_loyalty_rate_pct:63.1, avg_customer_age:32.4, demand_trend_pct:12.5,
};
const MOCK_DEMO = {
  age_distribution:[
    {group:"18-24",count:8862,pct:8.9},{group:"25-34",count:12665,pct:12.7},
    {group:"35-44",count:12731,pct:12.8},{group:"45-54",count:12770,pct:12.8},{group:"55+",count:12891,pct:12.9}
  ],
  age_category_prefs:{
    "18-24":[{category:"Fruits",units:1154},{category:"Beverages",units:1139},{category:"Vegetables",units:1129},{category:"Snacks",units:1100},{category:"Grocery",units:1080}],
    "25-34":[{category:"Fruits",units:1635},{category:"Beverages",units:1613},{category:"Grocery",units:1603},{category:"Snacks",units:1580},{category:"Home Care",units:1540}],
    "35-44":[{category:"Home Care",units:1635},{category:"Beverages",units:1619},{category:"Personal Care",units:1616},{category:"Grocery",units:1590},{category:"Dairy",units:1560}],
    "45-54":[{category:"Grocery",units:1616},{category:"Dairy",units:1612},{category:"Beverages",units:1608},{category:"Personal Care",units:1580},{category:"Home Care",units:1550}],
    "55+":[{category:"Snacks",units:1645},{category:"Personal Care",units:1641},{category:"Beverages",units:1631},{category:"Dairy",units:1600},{category:"Grocery",units:1570}],
  },
  channel_distribution:[
    {channel:"Online",count:33255,pct:33.3},{channel:"Offline",count:33362,pct:33.4},{channel:"Omnichannel",count:33383,pct:33.4}
  ],
  category_distribution:[
    {category:"Fruits",units:38195,pct:12.7},{category:"Beverages",units:37863,pct:12.6},
    {category:"Home Care",units:37790,pct:12.6},{category:"Snacks",units:37418,pct:12.5},
    {category:"Grocery",units:37400,pct:12.5},{category:"Vegetables",units:37381,pct:12.4},
    {category:"Personal Care",units:37012,pct:12.3},{category:"Dairy",units:36770,pct:12.2},
  ],
  gender_distribution:[
    {gender:"Male",count:44920,pct:47.5},{gender:"Female",count:44905,pct:47.5},{gender:"Other",count:5127,pct:5.0}
  ],
  payment_distribution:[
    {mode:"UPI",count:25236,pct:25.3},{mode:"Card",count:25127,pct:25.2},
    {mode:"Wallet",count:24888,pct:24.9},{mode:"Cash",count:24749,pct:24.8}
  ],
  city_distribution:[
    {city:"Kolkata",units:38049},{city:"Delhi",units:37946},{city:"Hyderabad",units:37568},
    {city:"Chennai",units:37533},{city:"Mumbai",units:37273},{city:"Bengaluru",units:37233},
    {city:"Ahmedabad",units:37209},{city:"Pune",units:37018}
  ],
  brand_distribution:[
    {brand:"ITC",units:38083},{brand:"HUL",units:37745},{brand:"Britannia",units:37602},
    {brand:"Amul",units:37597},{brand:"Nestle",units:37559},{brand:"Tata",units:37331},
    {brand:"PepsiCo",units:37205},{brand:"Parle",units:36707}
  ],
  channel_category:{
    "Online":[{category:"Beverages",units:12796},{category:"Fruits",units:12699},{category:"Vegetables",units:12586},{category:"Snacks",units:12500},{category:"Grocery",units:12400}],
    "Offline":[{category:"Fruits",units:12911},{category:"Snacks",units:12852},{category:"Beverages",units:12588},{category:"Grocery",units:12500},{category:"Dairy",units:12400}],
    "Omnichannel":[{category:"Home Care",units:12729},{category:"Personal Care",units:12663},{category:"Grocery",units:12652},{category:"Dairy",units:12500},{category:"Beverages",units:12400}],
  },
  loyalty:{loyal_pct:63.1, nonloyal_pct:36.9},
};

// ── API hook ──────────────────────────────────────────────────────────────────
function useApi(path, fallback) {
  const [data,setData]=useState(null); const [loading,setLoading]=useState(true);
  const [isLive,setIsLive]=useState(false); const [error,setError]=useState(null);
  useEffect(()=>{
    fetch(`${API_BASE}${path}`)
      .then(r=>{ if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d=>{
        if(d&&typeof d==="object"&&!Array.isArray(d)&&d.detail){ setError(d.detail); setData(fallback); setIsLive(false); }
        else { setData(d); setIsLive(true); setError(null); }
      })
      .catch(e=>{ setError(e.message); setData(fallback); setIsLive(false); })
      .finally(()=>setLoading(false));
  },[path]);
  return {data,loading,isLive,error};
}

// ── Chart.js loader ───────────────────────────────────────────────────────────
let _cjsLoaded=false;
function loadChartJs(cb){
  if(window.Chart){cb();return;}
  if(_cjsLoaded){const iv=setInterval(()=>{if(window.Chart){clearInterval(iv);cb();}},50);return;}
  _cjsLoaded=true;
  const s=document.createElement("script");
  s.src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
  s.onload=cb; document.head.appendChild(s);
}

// ── Reusable chart wrapper ────────────────────────────────────────────────────
function useChart(canvasRef, getConfig, deps) {
  const instRef = useRef(null);
  useEffect(()=>{
    if(!canvasRef.current) return;
    const init = ()=>{
      if(instRef.current) instRef.current.destroy();
      instRef.current = new window.Chart(canvasRef.current, getConfig());
    };
    loadChartJs(init);
    return ()=>{ if(instRef.current) instRef.current.destroy(); };
  }, deps);
}

// ── Shared chart components ───────────────────────────────────────────────────
function BarChart({ labels, values, colors, horizontal=false, height=220 }) {
  const ref=useRef(null);
  useChart(ref, ()=>({
    type:"bar",
    data:{ labels, datasets:[{ data:values, backgroundColor:colors||CHART_COLORS.slice(0,labels.length), borderRadius:5, borderSkipped:false }] },
    options:{
      indexAxis: horizontal?"y":"x",
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{callbacks:{label:ctx=>`${Math.round(ctx.parsed[horizontal?"x":"y"]).toLocaleString()} units`}} },
      scales:{
        x:{ grid:{color:"#F1F5F9"}, ticks:{color:C.textSub,font:{size:11}}, border:{color:C.border} },
        y:{ grid:{color:"#F1F5F9"}, ticks:{color:C.textSub,font:{size:11}, callback:v=>v>=1000?(v/1000).toFixed(0)+"K":v}, border:{color:C.border} },
      },
    },
  }), [JSON.stringify(labels), JSON.stringify(values)]);
  return <div style={{position:"relative",height}}><canvas ref={ref}/></div>;
}

function DonutChart({ labels, values, colors, centerText, centerSub, height=180 }) {
  const ref=useRef(null);
  const total=values.reduce((a,b)=>a+b,0);
  useChart(ref, ()=>({
    type:"doughnut",
    data:{ labels, datasets:[{ data:values, backgroundColor:colors||CHART_COLORS, borderWidth:0, hoverOffset:4 }] },
    options:{ responsive:true, maintainAspectRatio:false, cutout:"70%",
      plugins:{ legend:{display:false}, tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${ctx.parsed.toLocaleString()} (${((ctx.parsed/total)*100).toFixed(1)}%)`}} } },
  }), [JSON.stringify(values)]);
  return (
    <div style={{position:"relative",height}}>
      <canvas ref={ref}/>
      {centerText&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center",pointerEvents:"none"}}>
        <div style={{fontSize:18,fontWeight:700,color:C.text}}>{centerText}</div>
        {centerSub&&<div style={{fontSize:11,color:C.textSub}}>{centerSub}</div>}
      </div>}
    </div>
  );
}

function LineChart({ data }) {
  const ref=useRef(null); const inst=useRef(null);
  useEffect(()=>{
    if(!data?.length||!ref.current) return;
    loadChartJs(()=>{
      if(inst.current) inst.current.destroy();
      inst.current=new window.Chart(ref.current,{
        type:"line",
        data:{ labels:data.map(d=>{const dt=new Date(d.ds+"T00:00:00");return `${dt.toLocaleString("default",{month:"short"})} ${dt.getDate()}`;}),
          datasets:[
            {label:"Predicted Demand",data:data.map(d=>d.Predicted_Demand),borderColor:"#2563EB",backgroundColor:"rgba(37,99,235,0.07)",borderWidth:2,pointRadius:0,fill:true,tension:0.4},
            {label:"Stock On Hand",data:data.map(d=>d.Stock),borderColor:"#22C55E",backgroundColor:"transparent",borderWidth:1.5,borderDash:[5,4],pointRadius:0,fill:false,tension:0.4},
          ]},
        options:{ responsive:true, maintainAspectRatio:false,
          plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${Math.round(ctx.parsed.y).toLocaleString()} units`}}},
          scales:{
            x:{grid:{color:"#F1F5F9"},ticks:{color:C.textSub,font:{size:11},maxTicksLimit:10,autoSkip:true},border:{color:C.border}},
            y:{grid:{color:"#F1F5F9"},ticks:{color:C.textSub,font:{size:11},callback:v=>v>=1000?(v/1000).toFixed(1)+"K":v},border:{color:C.border}},
          }},
      });
    });
    return ()=>{if(inst.current) inst.current.destroy();};
  },[data]);
  return <div style={{position:"relative",height:240}}><canvas ref={ref}/></div>;
}

// ── Shared UI primitives ──────────────────────────────────────────────────────
function Card({ title, sub, children, style={} }) {
  return (
    <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden",...style}}>
      {title&&<div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontSize:14,fontWeight:600,color:C.text}}>{title}</div>
        {sub&&<div style={{fontSize:12,color:C.textSub,marginTop:2}}>{sub}</div>}
      </div>}
      <div style={{padding:"16px 20px"}}>{children}</div>
    </div>
  );
}

function KpiCard({ label, value, unit, sub, subColor, accent }) {
  return (
    <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"18px 20px",display:"flex",flexDirection:"column",gap:6,borderTop:`3px solid ${accent}`}}>
      <span style={{fontSize:11,color:C.textSub,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>{label}</span>
      <div style={{display:"flex",alignItems:"baseline",gap:6}}>
        <span style={{fontSize:28,fontWeight:700,color:C.text,lineHeight:1.1}}>{value}</span>
        {unit&&<span style={{fontSize:13,color:C.textSub}}>{unit}</span>}
      </div>
      {sub&&<span style={{fontSize:12,color:subColor||C.success,fontWeight:500}}>{sub}</span>}
    </div>
  );
}

function Badge({ risk }) {
  const hi=risk==="High";
  return <span style={{display:"inline-block",padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:600,background:hi?"#FEE2E2":"#DCFCE7",color:hi?"#B91C1C":"#15803D"}}>{risk}</span>;
}

function DemandBar({ demand, stock }) {
  const pct=Math.min((demand/Math.max(stock,1))*100,150), hi=demand>stock;
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{flex:1,height:6,background:"#F1F5F9",borderRadius:4}}>
        <div style={{height:"100%",width:`${Math.min(pct,100)}%`,background:hi?"#EF4444":"#22C55E",borderRadius:4}}/>
      </div>
      <span style={{fontSize:12,color:hi?"#EF4444":"#16A34A",fontWeight:600,minWidth:36,textAlign:"right"}}>{Math.round(pct)}%</span>
    </div>
  );
}

function LegendDot({ color, label, value, pct }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0"}}>
      <span style={{width:10,height:10,borderRadius:"50%",background:color,display:"inline-block",flexShrink:0}}/>
      <span style={{fontSize:13,color:C.text,flex:1}}>{label}</span>
      {value!==undefined&&<span style={{fontSize:13,fontWeight:600,color:C.text}}>{value.toLocaleString()}</span>}
      {pct!==undefined&&<span style={{fontSize:12,color:C.textSub,minWidth:40,textAlign:"right"}}>{pct}%</span>}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ screen, setScreen }) {
  const items=[
    {id:"overview",label:"Overview",icon:"🏠"},
    {id:"risk",label:"Risk & Inventory",icon:"🛡"},
    {id:"demographics",label:"Demographics",icon:"👥"},
    {id:"about",label:"About",icon:"ℹ️"},
  ];
  return (
    <aside style={{width:220,background:C.navy,display:"flex",flexDirection:"column",padding:"28px 16px",flexShrink:0,minHeight:"100vh"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:36,paddingLeft:4}}>
        <div style={{width:32,height:32,background:C.blue,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>📊</div>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:"#fff",lineHeight:1.2}}>Demand</div>
          <div style={{fontSize:14,fontWeight:700,color:"#93C5FD",lineHeight:1.2}}>Intelligence</div>
        </div>
      </div>
      <nav style={{display:"flex",flexDirection:"column",gap:4}}>
        {items.map(item=>(
          <button key={item.id} onClick={()=>setScreen(item.id)} style={{
            display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,border:"none",
            cursor:"pointer",textAlign:"left",
            background:screen===item.id?"rgba(37,99,235,0.25)":"transparent",
            color:screen===item.id?"#93C5FD":"#94A3B8",
            fontSize:14,fontWeight:screen===item.id?600:400,
            borderLeft:screen===item.id?`3px solid ${C.blue}`:"3px solid transparent",
            transition:"all 0.15s ease",
          }}>
            <span style={{fontSize:15}}>{item.icon}</span>{item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

// ── Overview Screen ───────────────────────────────────────────────────────────
function OverviewScreen({ forecast, summary }) {
  if(!forecast||!summary) return <div style={{textAlign:"center",padding:60,color:C.textSub}}>Loading…</div>;
  const total=parseFloat(summary.total_demand), trend=summary.demand_trend_pct;
  const tSign=trend>=0?"↑":"↓", tColor=trend>=0?C.success:C.danger;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:16}}>
        <KpiCard label="Total Predicted Demand" value={Math.round(total).toLocaleString()} unit="units" sub={`${tSign} ${Math.abs(trend)}% vs last 30 days`} subColor={tColor} accent={C.blue}/>
        <KpiCard label="High Risk Days" value={summary.high_risk_days} unit="days" sub={`↑ ${Math.ceil(summary.high_risk_days*0.28)} vs last 30 days`} subColor={C.danger} accent={C.danger}/>
        <KpiCard label="Low Risk Days" value={summary.low_risk_days} unit="days" sub={`↑ ${Math.ceil(summary.low_risk_days*0.09)} vs last 30 days`} accent={C.success}/>
        <KpiCard label="Avg Predicted Demand / Day" value={Math.round(summary.avg_demand_per_day).toLocaleString()} unit="units" sub={`${tSign} ${Math.abs(trend)}% vs last 30 days`} subColor={tColor} accent={C.amber}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr minmax(260px,340px)",gap:16}}>
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 24px"}}>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:15,fontWeight:600,color:C.text}}>Predicted Demand Trend</div>
            <div style={{display:"flex",gap:16,marginTop:8}}>
              <span style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.textSub}}>
                <span style={{width:20,height:2,background:"#2563EB",display:"inline-block",borderRadius:2}}/>Predicted Demand
              </span>
              <span style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.textSub}}>
                <span style={{width:20,height:0,border:"1.5px dashed #22C55E",display:"inline-block"}}/>Stock On Hand
              </span>
            </div>
          </div>
          <LineChart data={forecast}/>
        </div>
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 24px"}}>
          <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:20}}>Risk Distribution</div>
          <DonutChart labels={["High Risk","Low Risk"]} values={[summary.high_risk_days,summary.low_risk_days]}
            colors={["#EF4444","#22C55E"]} centerText={summary.high_risk_days+summary.low_risk_days} centerSub="Total Days" height={160}/>
          <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:4}}>
            <LegendDot color="#EF4444" label="High Risk" value={summary.high_risk_days} pct={((summary.high_risk_days/(summary.high_risk_days+summary.low_risk_days))*100).toFixed(1)}/>
            <LegendDot color="#22C55E" label="Low Risk"  value={summary.low_risk_days}  pct={((summary.low_risk_days/(summary.high_risk_days+summary.low_risk_days))*100).toFixed(1)}/>
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:16}}>
        {[["Avg Margin",`${summary.avg_margin_pct}%`,C.blue],["Avg Lead Time",`${summary.avg_lead_time_days}d`,C.amber],["Loyalty Rate",`${summary.avg_loyalty_rate_pct}%`,C.success],["Avg Customer Age",`${summary.avg_customer_age} yrs`,C.navy]].map(([label,val,accent])=>(
          <div key={label} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 18px",borderTop:`3px solid ${accent}`}}>
            <div style={{fontSize:11,color:C.textSub,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</div>
            <div style={{fontSize:22,fontWeight:700,color:C.text,marginTop:4}}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Risk Screen ───────────────────────────────────────────────────────────────
function RiskScreen({ forecast }) {
  const [startDate,setStartDate]=useState("2024-05-01");
  const [endDate,setEndDate]=useState("2024-06-30");
  const [riskFilter,setRiskFilter]=useState("All");
  const [page,setPage]=useState(1);
  const PER_PAGE=8;
  const filtered=(forecast||[]).filter(r=>r.ds>=startDate&&r.ds<=endDate&&(riskFilter==="All"||r.Risk===riskFilter));
  const totalPages=Math.ceil(filtered.length/PER_PAGE), paged=filtered.slice((page-1)*PER_PAGE,page*PER_PAGE);
  const highCount=filtered.filter(r=>r.Risk==="High").length;
  const hasTrend=filtered.length>5&&filtered.slice(-5).reduce((s,r)=>s+r.Predicted_Demand,0)>filtered.slice(0,5).reduce((s,r)=>s+r.Predicted_Demand,0);
  const inp={border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 10px",fontSize:13,color:C.text,background:C.white,outline:"none"};
  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px 20px"}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:16,alignItems:"flex-end"}}>
          {[["Start Date",startDate,setStartDate],["End Date",endDate,setEndDate]].map(([lbl,val,fn])=>(
            <div key={lbl}><label style={{fontSize:12,color:C.textSub,display:"block",marginBottom:4}}>{lbl}</label>
              <input type="date" value={val} style={inp} onChange={e=>{fn(e.target.value);setPage(1);}}/></div>
          ))}
          <div><label style={{fontSize:12,color:C.textSub,display:"block",marginBottom:4}}>Risk Filter</label>
            <select value={riskFilter} style={{...inp,paddingRight:28,cursor:"pointer"}} onChange={e=>{setRiskFilter(e.target.value);setPage(1);}}>
              {["All","High","Low"].map(o=><option key={o}>{o}</option>)}
            </select></div>
          <div style={{marginLeft:"auto",fontSize:13,color:C.textSub,alignSelf:"center"}}>{filtered.length} records</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:16,alignItems:"start"}}>
        <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
          <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,fontSize:15,fontWeight:600,color:C.text}}>Daily Demand, Stock &amp; Risk Details</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed"}}>
              <thead><tr style={{background:C.surface}}>
                {["Date","Predicted Demand","Stock On Hand","Risk","Demand vs Stock","Category","Channel"].map(h=>(
                  <th key={h} style={{padding:"10px 12px",fontSize:11,fontWeight:600,color:C.textSub,textAlign:"left",borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {paged.map((row,i)=>(
                  <tr key={row.ds} style={{background:i%2===0?C.white:C.surface,borderBottom:`1px solid ${C.border}`}}>
                    <td style={{padding:"10px 12px",fontSize:12,color:C.text,whiteSpace:"nowrap"}}>{new Date(row.ds+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</td>
                    <td style={{padding:"10px 12px",fontSize:13,color:C.text}}>{Math.round(row.Predicted_Demand).toLocaleString()}</td>
                    <td style={{padding:"10px 12px",fontSize:13,color:row.Stock?C.text:C.textSub}}>{row.Stock?Math.round(row.Stock).toLocaleString():"—"}</td>
                    <td style={{padding:"10px 12px"}}><Badge risk={row.Risk}/></td>
                    <td style={{padding:"10px 12px"}}><DemandBar demand={row.Predicted_Demand} stock={row.Stock||1000}/></td>
                    <td style={{padding:"10px 12px",fontSize:12,color:C.textSub}}>{row.Dominant_Category||"—"}</td>
                    <td style={{padding:"10px 12px",fontSize:12,color:C.textSub}}>{row.Dominant_Channel||"—"}</td>
                  </tr>
                ))}
                {paged.length===0&&<tr><td colSpan={7} style={{padding:32,textAlign:"center",color:C.textSub,fontSize:13}}>No records match the selected filters.</td></tr>}
              </tbody>
            </table>
          </div>
          {totalPages>1&&(
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"12px 20px",borderTop:`1px solid ${C.border}`}}>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:C.white,cursor:"pointer",color:C.textSub,fontSize:13}}>‹</button>
              {Array.from({length:Math.min(totalPages,5)},(_,i)=>i+1).map(p=>(
                <button key={p} onClick={()=>setPage(p)} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${p===page?C.blue:C.border}`,background:p===page?"#EFF6FF":C.white,cursor:"pointer",color:p===page?C.blue:C.text,fontSize:13,fontWeight:p===page?600:400}}>{p}</button>
              ))}
              {totalPages>5&&<span style={{color:C.textSub,fontSize:13}}>…</span>}
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:C.white,cursor:"pointer",color:C.textSub,fontSize:13}}>›</button>
            </div>
          )}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{fontSize:14,fontWeight:600,color:C.text,padding:"0 4px 4px"}}>Key Insights</div>
          {highCount>0&&<div style={{background:C.dangerBg,border:`1px solid ${C.dangerBorder}`,borderRadius:12,padding:"14px 16px",display:"flex",gap:10}}><span style={{fontSize:18,flexShrink:0}}>⚠️</span><span style={{fontSize:13,color:"#7F1D1D",lineHeight:1.5}}><strong>{highCount} day{highCount>1?"s":""}</strong> at high risk of stockout in selected period.</span></div>}
          {hasTrend&&<div style={{background:C.blueLight,border:`1px solid ${C.blueBorder}`,borderRadius:12,padding:"14px 16px",display:"flex",gap:10}}><span style={{fontSize:18,flexShrink:0}}>📈</span><span style={{fontSize:13,color:"#1E3A5F",lineHeight:1.5}}>Predicted demand shows an <strong>upward trend</strong> towards the end of the period.</span></div>}
          <div style={{background:C.successBg,border:`1px solid ${C.successBorder}`,borderRadius:12,padding:"14px 16px",display:"flex",gap:10}}><span style={{fontSize:18,flexShrink:0}}>🛡️</span><span style={{fontSize:13,color:"#14532D",lineHeight:1.5}}>Maintain stock <strong>above</strong> predicted demand to avoid lost sales.</span></div>
          {filtered.length>0&&<div style={{background:C.amberBg,border:`1px solid ${C.amberBorder}`,borderRadius:12,padding:"14px 16px",display:"flex",gap:10}}><span style={{fontSize:18,flexShrink:0}}>📊</span><span style={{fontSize:13,color:"#78350F",lineHeight:1.5}}>Avg demand in range: <strong>{Math.round(filtered.reduce((s,r)=>s+r.Predicted_Demand,0)/filtered.length).toLocaleString()} units/day</strong>.</span></div>}
        </div>
      </div>
    </div>
  );
}

// ── Demographics Screen ───────────────────────────────────────────────────────
function DemographicsScreen({ demo }) {
  const [activeAgeGroup, setActiveAgeGroup] = useState("25-34");
  if(!demo) return <div style={{textAlign:"center",padding:60,color:C.textSub}}>Loading demographics…</div>;

  const { age_distribution, age_category_prefs, channel_distribution, category_distribution,
          gender_distribution, payment_distribution, city_distribution, brand_distribution,
          channel_category, loyalty } = demo;

  // ── Row 1: KPI strip ──────────────────────────────────────────────────────
  const totalCustomers = age_distribution.reduce((s,r)=>s+r.count,0);
  const topCat = category_distribution[0];
  const topCity = city_distribution[0];
  const topChannel = [...channel_distribution].sort((a,b)=>b.count-a.count)[0];

  // ── Age group category prefs (selected group) ─────────────────────────────
  const ageCatData = age_category_prefs[activeAgeGroup] || [];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>

      {/* ── KPI Strip ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:16}}>
        {[
          ["Total Customers",totalCustomers.toLocaleString(),"records",C.blue],
          ["Top Category",topCat?.category,"by volume",C.success],
          ["Top City",topCity?.city,"by units",C.amber],
          ["Loyal Customers",`${loyalty.loyal_pct}%`,"of buyers",C.purple],
        ].map(([label,val,unit,accent])=>(
          <KpiCard key={label} label={label} value={val} unit={unit} accent={accent}/>
        ))}
      </div>

      {/* ── Row 2: Age Distribution + Category Distribution ── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <Card title="Age Group Distribution" sub="Number of customers by age bracket">
          <BarChart
            labels={age_distribution.map(r=>r.group)}
            values={age_distribution.map(r=>r.count)}
            colors={CHART_COLORS.slice(0,age_distribution.length)}
            height={200}
          />
          <div style={{display:"flex",flexWrap:"wrap",gap:"6px 14px",marginTop:12}}>
            {age_distribution.map((r,i)=>(
              <LegendDot key={r.group} color={CHART_COLORS[i]} label={r.group} value={r.count} pct={r.pct}/>
            ))}
          </div>
        </Card>

        <Card title="Category Sales Volume" sub="Total units sold per product category">
          <BarChart
            labels={category_distribution.map(r=>r.category)}
            values={category_distribution.map(r=>r.units)}
            colors={CHART_COLORS.slice(0,category_distribution.length)}
            height={200}
          />
        </Card>
      </div>

      {/* ── Row 3: What each age group buys ── */}
      <Card title="Category Preferences by Age Group" sub="Which categories each age group buys the most — select an age group to explore">
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
          {age_distribution.map((r,i)=>(
            <button key={r.group} onClick={()=>setActiveAgeGroup(r.group)} style={{
              padding:"6px 14px",borderRadius:20,border:`1px solid ${activeAgeGroup===r.group?CHART_COLORS[i]:C.border}`,
              background:activeAgeGroup===r.group?CHART_COLORS[i]+"18":C.white,
              color:activeAgeGroup===r.group?CHART_COLORS[i]:C.textSub,
              fontSize:13,fontWeight:activeAgeGroup===r.group?600:400,cursor:"pointer",transition:"all 0.15s",
            }}>{r.group}</button>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,alignItems:"center"}}>
          <BarChart
            labels={ageCatData.map(r=>r.category)}
            values={ageCatData.map(r=>r.units)}
            colors={ageCatData.map((_,i)=>CHART_COLORS[i%CHART_COLORS.length])}
            height={200}
          />
          <div>
            <div style={{fontSize:13,color:C.textSub,marginBottom:10}}>Units sold to age group <strong style={{color:C.text}}>{activeAgeGroup}</strong></div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {ageCatData.map((r,i)=>{
                const max=ageCatData[0]?.units||1;
                return (
                  <div key={r.category}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:12,color:C.text,fontWeight:500}}>{r.category}</span>
                      <span style={{fontSize:12,color:C.textSub}}>{r.units.toLocaleString()}</span>
                    </div>
                    <div style={{height:6,background:C.surface,borderRadius:4}}>
                      <div style={{height:"100%",width:`${(r.units/max)*100}%`,background:CHART_COLORS[i%CHART_COLORS.length],borderRadius:4,transition:"width 0.4s ease"}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Row 4: Channel + Gender + Payment ── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
        <Card title="Channel Distribution" sub="Online vs Offline vs Omnichannel">
          <DonutChart
            labels={channel_distribution.map(r=>r.channel)}
            values={channel_distribution.map(r=>r.count)}
            colors={["#2563EB","#22C55E","#F59E0B"]}
            centerText={`${channel_distribution[0]?.pct}%`} centerSub={channel_distribution[0]?.channel}
            height={160}
          />
          <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:4}}>
            {channel_distribution.map((r,i)=>(
              <LegendDot key={r.channel} color={["#2563EB","#22C55E","#F59E0B"][i]} label={r.channel} value={r.count} pct={r.pct}/>
            ))}
          </div>
        </Card>

        <Card title="Gender Split" sub="Customer gender breakdown">
          <DonutChart
            labels={gender_distribution.map(r=>r.gender)}
            values={gender_distribution.map(r=>r.count)}
            colors={["#2563EB","#EC4899","#8B5CF6"]}
            height={160}
          />
          <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:4}}>
            {gender_distribution.map((r,i)=>(
              <LegendDot key={r.gender} color={["#2563EB","#EC4899","#8B5CF6"][i]} label={r.gender} value={r.count} pct={r.pct}/>
            ))}
          </div>
        </Card>

        <Card title="Payment Modes" sub="How customers pay">
          <DonutChart
            labels={payment_distribution.map(r=>r.mode)}
            values={payment_distribution.map(r=>r.count)}
            colors={["#06B6D4","#8B5CF6","#F97316","#6366F1"]}
            height={160}
          />
          <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:4}}>
            {payment_distribution.map((r,i)=>(
              <LegendDot key={r.mode} color={["#06B6D4","#8B5CF6","#F97316","#6366F1"][i]} label={r.mode} value={r.count} pct={r.pct}/>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Row 5: City + Brand ── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <Card title="City-wise Sales Volume" sub="Units sold per city across all categories">
          <BarChart
            labels={city_distribution.map(r=>r.city)}
            values={city_distribution.map(r=>r.units)}
            colors={CHART_COLORS.slice(0,city_distribution.length)}
            height={220}
          />
        </Card>

        <Card title="Brand Popularity" sub="Total units sold per brand">
          <BarChart
            labels={brand_distribution.map(r=>r.brand)}
            values={brand_distribution.map(r=>r.units)}
            colors={["#2563EB","#22C55E","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#F97316","#EC4899"]}
            height={220}
          />
        </Card>
      </div>

      {/* ── Row 6: Channel × Category heatmap-style table ── */}
      <Card title="Channel × Category Breakdown" sub="Which categories are bought through which channels (units sold)">
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{background:C.surface}}>
                <th style={{padding:"10px 14px",textAlign:"left",color:C.textSub,fontWeight:600,fontSize:12,borderBottom:`1px solid ${C.border}`}}>Channel</th>
                {(channel_category["Online"]||[]).map(r=>(
                  <th key={r.category} style={{padding:"10px 10px",textAlign:"center",color:C.textSub,fontWeight:600,fontSize:12,borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{r.category}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(channel_category).map(([ch,cats],ri)=>{
                const allUnits=cats.map(c=>c.units);
                const maxUnits=Math.max(...allUnits);
                return (
                  <tr key={ch} style={{background:ri%2===0?C.white:C.surface,borderBottom:`1px solid ${C.border}`}}>
                    <td style={{padding:"10px 14px",fontWeight:600,color:C.text,whiteSpace:"nowrap"}}>
                      <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
                        <span style={{width:8,height:8,borderRadius:"50%",background:["#2563EB","#22C55E","#F59E0B"][ri],display:"inline-block"}}/>
                        {ch}
                      </span>
                    </td>
                    {cats.map(c=>{
                      const intensity=c.units/maxUnits;
                      return (
                        <td key={c.category} style={{padding:"10px 10px",textAlign:"center"}}>
                          <div style={{
                            background:`rgba(37,99,235,${0.08+intensity*0.22})`,
                            borderRadius:6,padding:"6px 8px",
                            fontWeight:600,color:intensity>0.7?"#1E3A5F":"#374151",fontSize:12,
                          }}>
                            {(c.units/1000).toFixed(1)}K
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{marginTop:12,padding:"10px 14px",background:C.surface,borderRadius:8,fontSize:12,color:C.textSub}}>
          💡 Darker cells indicate higher sales volume. Omnichannel drives strongest Home Care &amp; Personal Care; Online leads Beverages &amp; Fruits; Offline dominates Snacks.
        </div>
      </Card>

      {/* ── Row 7: Loyalty ── */}
      <Card title="Customer Loyalty" sub="Proportion of repeat vs new customers">
        <div style={{display:"flex",alignItems:"center",gap:32}}>
          <DonutChart
            labels={["Loyal","Non-Loyal"]}
            values={[loyalty.loyal_pct, loyalty.nonloyal_pct]}
            colors={["#22C55E","#E2E8F0"]}
            centerText={`${loyalty.loyal_pct}%`} centerSub="Loyal"
            height={160}
          />
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:12}}>
            <div style={{background:C.successBg,border:`1px solid ${C.successBorder}`,borderRadius:10,padding:"14px 16px"}}>
              <div style={{fontSize:18,fontWeight:700,color:"#166534"}}>{loyalty.loyal_pct}%</div>
              <div style={{fontSize:13,color:"#166534",marginTop:2}}>Loyal customers — repeat buyers with recorded loyalty flag</div>
            </div>
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px"}}>
              <div style={{fontSize:18,fontWeight:700,color:C.textSub}}>{loyalty.nonloyal_pct}%</div>
              <div style={{fontSize:13,color:C.textSub,marginTop:2}}>Non-loyal — one-time or unregistered buyers</div>
            </div>
            <div style={{fontSize:12,color:C.textSub,lineHeight:1.6}}>
              💡 With over <strong>{loyalty.loyal_pct}%</strong> loyalty, targeted retention and cross-sell campaigns can significantly boost lifetime value.
            </div>
          </div>
        </div>
      </Card>

    </div>
  );
}

// ── About Screen ──────────────────────────────────────────────────────────────
function AboutScreen() {
  return (
    <div style={{maxWidth:720,margin:"0 auto"}}>
      <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
        <div style={{background:`linear-gradient(135deg,${C.navy} 0%,${C.navyMid} 100%)`,padding:"32px 36px"}}>
          <div style={{fontSize:22,fontWeight:700,color:"#fff"}}>InsightDemand AI</div>
          <div style={{fontSize:14,color:"#93C5FD",marginTop:6}}>Consumer Analytics-Driven Demand Intelligence Platform</div>
        </div>
        <div style={{padding:"28px 36px",display:"flex",flexDirection:"column",gap:20}}>
          <p style={{fontSize:14,color:C.textSub,lineHeight:1.7,margin:0}}>
            InsightDemand AI predicts future FMCG product demand using Facebook Prophet with multi-feature regressors,
            detects stockout risks, surfaces inventory insights, and analyses consumer demographics — all in one dashboard.
          </p>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:10}}>Technology Stack</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[["Forecasting Engine","Python + Prophet"],["Backend APIs","FastAPI"],
                ["Frontend","React + Chart.js"],["Data Source","Indian FMCG Dataset 2024"]].map(([l,v])=>(
                <div key={l} style={{background:C.surface,borderRadius:8,padding:"10px 14px"}}>
                  <div style={{fontSize:11,color:C.textSub,textTransform:"uppercase",letterSpacing:"0.05em"}}>{l}</div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text,marginTop:2}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:10}}>API Endpoints</div>
            <div style={{fontFamily:"monospace",fontSize:13,background:C.surface,borderRadius:8,padding:"14px 16px",display:"flex",flexDirection:"column",gap:6}}>
              {[["GET","/","Health check"],["GET","/forecast","Full forecast with filters"],
                ["GET","/summary","KPI metrics"],["GET","/demographics","Consumer demographics"],
                ["GET","/categories","Unique categories & channels"],["POST","/refresh","Re-train model"]].map(([m,p,d])=>(
                <div key={p}>
                  <span style={{color:m==="GET"?"#22C55E":"#F59E0B"}}>{m}</span>{" "}
                  <span style={{color:C.blue}}>{p}</span>{" "}
                  <span style={{color:C.textSub}}>— {d}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{padding:"14px 16px",background:C.successBg,borderRadius:10,fontSize:13,color:"#166534"}}>
            <strong>Note:</strong> Dashboard falls back to mock data when the backend is offline.
            Start FastAPI at <code style={{background:"#dcfce7",padding:"1px 5px",borderRadius:4}}>http://localhost:8000</code> to connect live data.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen,setScreen]=useState("overview");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const {data:forecast,isLive,loading:fLoading,error:fError}=useApi(`/forecast?category=${selectedCategory}`, MOCK_FORECAST);
  const {data:summary, loading:sLoading,error:sError}        =useApi(`/summary?category=${selectedCategory}`, MOCK_SUMMARY);
  const {data:demo,    loading:dLoading,error:dError}        =useApi("/demographics",MOCK_DEMO);
  const { data: categoryData } = useApi("/categories", { categories: ["All"] });

  const safeSummary  =(summary  &&summary.total_demand!==undefined)?summary :MOCK_SUMMARY;
  const safeForecast =(Array.isArray(forecast)&&forecast.length>0) ?forecast:MOCK_FORECAST;
  const safeDemo     =(demo&&demo.age_distribution)                ?demo    :MOCK_DEMO;

  const apiError=fError||sError||dError;
  const loading=fLoading||sLoading||dLoading;

  const titles={overview:"Demand Overview",risk:"Risk & Inventory Insights",demographics:"Consumer Demographics",about:"About InsightDemand AI"};
  const subs  ={overview:"Track predicted demand and risk summary",risk:"View predicted demand, stock levels and risk status",
                demographics:"Age groups, categories, channels, cities and buying behaviour",about:"Platform information and API reference"};

  return (
    <div style={{display:"flex",minHeight:"100vh",fontFamily:"'Inter',system-ui,sans-serif",background:"#F1F5F9"}}>
      <Sidebar screen={screen} setScreen={setScreen}/>
      <main style={{flex:1,padding:"28px 32px",overflowY:"auto"}}>
        {apiError&&(
          <div style={{marginBottom:16,padding:"10px 16px",borderRadius:10,background:"#FEF2F2",border:"1px solid #FECACA",
                       fontSize:13,color:"#991B1B",display:"flex",alignItems:"flex-start",gap:8}}>
            <span style={{flexShrink:0}}>⚠️</span>
            <div><strong>Backend error — showing mock data.</strong>{" "}
              Run: <code style={{background:"#fee2e2",padding:"1px 6px",borderRadius:4}}>pip uninstall prophet pystan -y</code>{" "}then{" "}
              <code style={{background:"#fee2e2",padding:"1px 6px",borderRadius:4}}>pip install cmdstanpy==1.2.4 prophet==1.1.5</code> and restart uvicorn.
            </div>
          </div>
        )}
        <header style={{marginBottom:24,display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
          <div>
            <h1 style={{fontSize:22,fontWeight:700,color:C.text,margin:0}}>{titles[screen]}</h1>
            <p style={{fontSize:13,color:C.textSub,margin:"4px 0 0"}}>{subs[screen]}</p>
          </div>
          {screen !== "demographics" && screen !== "about" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }} >
              <label style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>
                Category
              </label>

              <select
                value={selectedCategory}
                onChange={(e) =>
                  setSelectedCategory(e.target.value)
                }
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #CBD5E1",
                  fontSize: 13,
                  background: "#fff",
                  cursor: "pointer"
                }}
              >
                {(categoryData?.categories || []).map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          <span style={{fontSize:11,padding:"4px 10px",borderRadius:20,fontWeight:600,
                        background:loading?"#F1F5F9":isLive?"#DCFCE7":"#FEF3C7",
                        color:     loading?"#64748B":isLive?"#15803D":"#92400E"}}>
            {loading?"● Loading…":isLive?"● Live API":"● Mock Data"}
          </span>
        </header>
        {screen==="overview"     && <OverviewScreen     forecast={safeForecast} summary={safeSummary}/>}
        {screen==="risk"         && <RiskScreen         forecast={safeForecast}/>}
        {screen==="demographics" && <DemographicsScreen demo={safeDemo}/>}
        {screen==="about"        && <AboutScreen/>}
      </main>
    </div>
  );
}
