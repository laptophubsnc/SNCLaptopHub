const KEY="laptophub_reservations_v2";
const RATE=50;
const laptops=Array.from({length:10},(_,i)=>`Laptop ${String(i+1).padStart(2,"0")}`);
const $=id=>document.getElementById(id);
const today=new Date().toISOString().slice(0,10);
$("availabilityDate").value=today;
$("date").value=today;

function getReservations(){return JSON.parse(localStorage.getItem(KEY)||"[]")}
function saveReservations(x){localStorage.setItem(KEY,JSON.stringify(x))}
function toMin(t){const [h,m]=t.split(":").map(Number);return h*60+m}
function overlaps(aStart,aEnd,bStart,bEnd){return aStart<bEnd && bStart<aEnd}
function isReserved(laptop,date,start,end){
  return getReservations().some(r=>{
    if(r.laptop!==laptop) return false;
    const rStart=new Date(`${r.date}T00:00:00`).getTime()+r.startMin*60000;
    const rEnd=new Date(`${r.date}T00:00:00`).getTime()+r.endMin*60000;
    const base=new Date(`${date}T00:00:00`).getTime();
    const qStart=base+start*60000, qEnd=base+end*60000;
    return overlaps(qStart,qEnd,rStart,rEnd);
  })
}
function formatTime(min){
  let dayOffset=Math.floor(min/1440), x=((min%1440)+1440)%1440;
  const h=Math.floor(x/60),m=x%60;
  return `${((h+11)%12)+1}:${String(m).padStart(2,"0")} ${h<12?"AM":"PM"}${dayOffset?` (+${dayOffset} day${dayOffset>1?"s":""})`:""}`;
}
function endDateLabel(date,startMin,hours){
  const base=new Date(`${date}T00:00:00`);
  const end=new Date(base.getTime()+(startMin+hours*60)*60000);
  return end.toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"});
}
function getWindow(){
  const date=$("date").value||today;
  const start=toMin($("startTime").value||"08:00");
  const hours=Math.min(120,Math.max(1,Number($("hours").value||1)));
  return {date,start,end:start+hours*60,hours};
}
function renderAvailability(){
  const date=$("availabilityDate").value||today;
  const type=$("availabilityType").value;
  let start,end;
  if(type==="overnight"){start=17*60;end=start+15*60}
  else {start=8*60;end=17*60}
  $("laptopGrid").innerHTML=laptops.map(l=>{
    const used=isReserved(l,date,start,end);
    return `<div class="laptop-card"><strong>${l}</strong><span class="status ${used?"reserved":"ready"}">${used?"RESERVED":"READY FOR RENT"}</span></div>`
  }).join("");
}
function fillStartTimes(){
  const opts=[];
  for(let h=8;h<=17;h++){
    if(h===17) opts.push(`<option value="17:00">5:00 PM</option>`);
    else opts.push(`<option value="${String(h).padStart(2,"0")}:00">${h<12?h:h===12?12:h-12}:00 ${h<12?"AM":"PM"}</option>`);
  }
  $("startTime").innerHTML=opts.join("");
}
function fillLaptopChoices(){
  const {date,start,end}=getWindow();
  $("laptop").innerHTML=laptops.map(l=>{
    const used=isReserved(l,date,start,end);
    return `<option value="${l}" ${used?"disabled":""}>${l}${used?" — RESERVED":""}</option>`
  }).join("");
  if([...$("laptop").options].every(o=>o.disabled)) $("laptop").innerHTML='<option value="">No laptop available for this period</option>';
}
function updateForm(){
  const {date,start,hours,end}=getWindow();
  const total=hours*RATE;
  $("summaryPeriod").textContent=`${date} ${formatTime(start)} → ${endDateLabel(date,start,hours)}`;
  $("summaryTotal").textContent=`₱${total.toLocaleString()}`;
  fillLaptopChoices();
}
function refresh(){renderAvailability();updateForm()}
$("availabilityDate").addEventListener("change",renderAvailability);
$("availabilityType").addEventListener("change",renderAvailability);
["date","startTime","hours"].forEach(id=>$(id).addEventListener("change",updateForm));
$("hours").addEventListener("input",updateForm);

$("reservationForm").addEventListener("submit",e=>{
  e.preventDefault();
  const name=$("name").value.trim(), phone=$("phone").value.trim();
  const {date,start,end,hours}=getWindow(), laptop=$("laptop").value;
  if(!laptop){$("formMessage").textContent="Please choose an available laptop.";return}
  if(!$("ageCheck").checked){$("formMessage").textContent="Please confirm that you are 18+ and can present a valid ID for take-home rental.";return}
  if(isReserved(laptop,date,start,end)){
    $("formMessage").textContent="That laptop was just reserved. Please choose another.";
    refresh(); return;
  }
  const reservations=getReservations();
  reservations.push({
    id:Date.now(),name,phone,date,laptop,payment:$("payment").value,
    startMin:start,endMin:end,hours,total:hours*RATE,
    createdAt:new Date().toISOString()
  });
  saveReservations(reservations);
  $("formMessage").innerHTML=`Reservation saved for <b>${laptop}</b>. Total: <b>₱${(hours*RATE).toLocaleString()}</b>. Please message our Facebook page or call 09628637697 to confirm.`;
  e.target.reset();
  $("date").value=date;
  $("hours").value=hours;
  fillStartTimes(); refresh();
});
fillStartTimes(); refresh();
