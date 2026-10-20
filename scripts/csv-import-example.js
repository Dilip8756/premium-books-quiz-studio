// Browser-side helper example for CSV-to-question conversion.
// CSV headers: question,A,B,C,D,answer,explanation,category
export function parseQuizCsv(text) {
 const lines=text.trim().split(/\r?\n/);
 const split=(line)=>{const out=[];let cur="",quoted=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'&&line[i+1]==='"'&&quoted){cur+='"';i++;}else if(c==='"'){quoted=!quoted;}else if(c===','&&!quoted){out.push(cur);cur="";}else cur+=c;}out.push(cur);return out;};
 const headers=split(lines.shift()).map(s=>s.trim());
 return lines.filter(Boolean).map(line=>{const cols=split(line);const row=Object.fromEntries(headers.map((h,i)=>[h,cols[i]??""]));return {question:row.question,options:[row.A,row.B,row.C,row.D],answer:Number(row.answer),explanation:row.explanation,category:row.category||"सामान्य ज्ञान"};});
}
