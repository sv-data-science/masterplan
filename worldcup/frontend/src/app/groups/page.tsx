'use client';
import { useQuery } from '@tanstack/react-query';
import { matchesApi } from '@/lib/api';
import { Match, Team } from '@/types';

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

interface Stats { team:Team; played:number; won:number; drawn:number; lost:number; gf:number; ga:number; points:number; }

function buildTable(matches: Match[]): Stats[] {
  const s = new Map<string,Stats>();
  const ensure = (team:Team) => { if(!s.has(team.id)) s.set(team.id,{team,played:0,won:0,drawn:0,lost:0,gf:0,ga:0,points:0}); return s.get(team.id)!; };
  for(const m of matches){
    if(m.status!=='completed'||m.home_score===null||m.away_score===null){ensure(m.home_team);ensure(m.away_team);continue;}
    const h=ensure(m.home_team),a=ensure(m.away_team);
    h.played++;a.played++;h.gf+=m.home_score;h.ga+=m.away_score;a.gf+=m.away_score;a.ga+=m.home_score;
    if(m.home_score>m.away_score){h.won++;h.points+=3;a.lost++;}
    else if(m.home_score<m.away_score){a.won++;a.points+=3;h.lost++;}
    else{h.drawn++;h.points++;a.drawn++;a.points++;}
  }
  return Array.from(s.values()).sort((a,b)=>b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf);
}

function GroupTable({g,matches}:{g:string;matches:Match[]}) {
  const rows = buildTable(matches);
  return (
    <div className="card overflow-hidden">
      <div className="bg-green-900/30 px-4 py-2 border-b border-[#30363d]"><h2 className="font-bold text-white">Group {g}</h2></div>
      <table className="w-full text-sm">
        <thead><tr className="text-xs text-gray-500 uppercase border-b border-[#30363d]">
          <th className="text-left px-4 py-2 font-medium">Team</th>
          <th className="text-center px-2 py-2">P</th><th className="text-center px-2 py-2">W</th>
          <th className="text-center px-2 py-2">D</th><th className="text-center px-2 py-2">L</th>
          <th className="text-center px-2 py-2">GD</th><th className="text-center px-2 py-2 text-white font-bold">Pts</th>
        </tr></thead>
        <tbody className="divide-y divide-[#30363d]">
          {rows.map((row,i) => (
            <tr key={row.team.id} className={`${i<2?'border-l-2 border-l-green-600':''} hover:bg-[#1c2128]`}>
              <td className="px-4 py-2.5"><div className="flex items-center gap-2"><span>{row.team.flag}</span><span className="font-medium">{row.team.name}</span><span className="text-xs text-gray-500">{row.team.code}</span></div></td>
              <td className="text-center px-2 py-2.5 text-gray-400">{row.played}</td>
              <td className="text-center px-2 py-2.5 text-gray-400">{row.won}</td>
              <td className="text-center px-2 py-2.5 text-gray-400">{row.drawn}</td>
              <td className="text-center px-2 py-2.5 text-gray-400">{row.lost}</td>
              <td className="text-center px-2 py-2.5 text-gray-400">{row.gf-row.ga>=0?'+':''}{row.gf-row.ga}</td>
              <td className="text-center px-2 py-2.5 font-bold">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GroupsPage() {
  const { data:matches=[], isLoading } = useQuery<Match[]>({ queryKey:['matches','all'], queryFn:()=>matchesApi.list().then(r=>r.data), staleTime:60_000, refetchInterval:120_000 });
  if(isLoading) return <div className="text-center py-12 text-gray-500">Loading…</div>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Group Stage</h1>
      <p className="text-sm text-gray-400">Top 2 from each group + 8 best 3rd-place teams advance to the Round of 32.</p>
      <div className="grid md:grid-cols-2 gap-4">{GROUPS.map(g=><GroupTable key={g} g={g} matches={matches.filter(m=>m.group_letter===g)} />)}</div>
    </div>
  );
}
