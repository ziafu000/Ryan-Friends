export function pickRewards(table){
  const total = table.reduce((s,r)=>s+(r.weight||1),0);
  const roll = Math.random() * total;
  let acc = 0;
  for(const r of table){
    acc += (r.weight||1);
    if(roll <= acc) return [r];
  }
  return [];
}