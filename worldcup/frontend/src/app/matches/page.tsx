'use client';
import { useQuery } from '@tanstack/react-query';
import { matchesApi } from '@/lib/api';
import { Match } from '@/types';
import { MatchCard } from '@/components/MatchCard';
import { useState } from 'react';

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

export default function MatchesPage() {
  const [selectedGroup, setSelectedGroup] = useState<string|null>(null);
  const [selectedMD, setSelectedMD] = useState<number|null>(null);

  const { data: matches=[], isLoading } = useQuery<Match[]>({
    queryKey: ['matches', selectedGroup??'all', String(selectedMD??'all')],
    queryFn: () => matchesApi.list({ group: selectedGroup??undefined, matchday: selectedMD??undefined }).then(r=>r.data),
    staleTime: 30_000,
  });

  const grouped = matches.reduce<Record<string,Match[]>>((acc,m) => {
    const key=`Group ${m.group_letter}`; acc[key]=acc[key]??[]; acc[key].push(m); return acc;
  },{});

  const FilterBtn = ({active,onClick,label}:{active:boolean;onClick:()=>void;label:string}) => (
    <button onClick={onClick} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors border ${active?'bg-green-600 border-green-600 text-white':'border-[#30363d] text-gray-400 hover:text-white hover:border-gray-500'}`}>{label}</button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Matches</h1>
        <div className="flex gap-2 flex-wrap">
          {[null,1,2,3].map(md=><FilterBtn key={md??'all'} active={selectedMD===md} onClick={()=>setSelectedMD(md)} label={md===null?'All':`MD${md}`} />)}
          <div className="w-px bg-[#30363d]" />
          <FilterBtn active={selectedGroup===null} onClick={()=>setSelectedGroup(null)} label="All Groups" />
          {GROUPS.map(g=><FilterBtn key={g} active={selectedGroup===g} onClick={()=>setSelectedGroup(g)} label={g} />)}
        </div>
      </div>
      {isLoading && <div className="text-center py-12 text-gray-500">Loading matches…</div>}
      {Object.entries(grouped).sort(([a],[b])=>a.localeCompare(b)).map(([groupName,gMatches])=>(
        <section key={groupName}>
          <h2 className="font-bold text-gray-300 mb-3">{groupName}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {gMatches.sort((a,b)=>a.matchday-b.matchday||a.match_number-b.match_number).map(m=>(
              <MatchCard key={m.id} match={m} queryKey={['matches',selectedGroup??'all',String(selectedMD??'all')]} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
