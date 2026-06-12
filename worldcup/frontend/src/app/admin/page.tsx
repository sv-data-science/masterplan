'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { matchesApi } from '@/lib/api';
import { Match } from '@/types';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

function ScoreRow({match,onUpdated}:{match:Match;onUpdated:()=>void}) {
  const [home,setHome] = useState(match.home_score?.toString()??'');
  const [away,setAway] = useState(match.away_score?.toString()??'');
  const [status,setStatus] = useState(match.status);
  const [saving,setSaving] = useState(false);

  const save = async () => {
    const h=parseInt(home),a=parseInt(away);
    if(isNaN(h)||isNaN(a)){toast.error('Enter valid scores');return;}
    setSaving(true);
    try{await matchesApi.updateScore(match.id,h,a,status);toast.success(`Saved!`);onUpdated();}
    catch{toast.error('Save failed');}
    finally{setSaving(false);}
  };

  const kickoff = match.kickoff_utc ? new Date(match.kickoff_utc).toLocaleDateString(undefined,{month:'short',day:'numeric'}) : '?';
  return (
    <tr className="border-b border-[#30363d] hover:bg-[#1c2128]">
      <td className="px-3 py-2 text-xs text-gray-500">#{match.match_number}<br/><span className="text-gray-600">G{match.group_letter} MD{match.matchday}</span></td>
      <td className="px-3 py-2 text-sm whitespace-nowrap">{match.home_team.flag} {match.home_team.code} <span className="text-gray-600">vs</span> {match.away_team.code} {match.away_team.flag}</td>
      <td className="px-3 py-2 text-xs text-gray-500">{kickoff}</td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <input type="number" min={0} max={20} value={home} onChange={e=>setHome(e.target.value)} className="input w-12 py-1 text-sm text-center" placeholder="-" />
          <span className="text-gray-600">–</span>
          <input type="number" min={0} max={20} value={away} onChange={e=>setAway(e.target.value)} className="input w-12 py-1 text-sm text-center" placeholder="-" />
        </div>
      </td>
      <td className="px-3 py-2">
        <select value={status} onChange={e=>setStatus(e.target.value as Match['status'])} className="input py-1 text-sm">
          <option value="scheduled">Scheduled</option>
          <option value="live">Live</option>
          <option value="completed">Completed</option>
        </select>
      </td>
      <td className="px-3 py-2"><button onClick={save} disabled={saving} className="btn-primary py-1 text-sm">{saving?'…':'Save'}</button></td>
    </tr>
  );
}

export default function AdminPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  useEffect(() => { if(user&&!user.is_admin) router.push('/'); },[user]);

  const [filterGroup,setFilterGroup] = useState('');
  const [filterStatus,setFilterStatus] = useState('');
  const { data:matches=[],isLoading } = useQuery<Match[]>({ queryKey:['matches','admin'], queryFn:()=>matchesApi.list().then(r=>r.data), staleTime:10_000 });
  const filtered = matches.filter(m=>(!filterGroup||m.group_letter===filterGroup)&&(!filterStatus||m.status===filterStatus));
  const GROUPS=['A','B','C','D','E','F','G','H','I','J','K','L'];

  if(!user) return <div className="text-center py-12 text-gray-500">Loading…</div>;
  if(!user.is_admin) return <div className="text-center py-12 text-gray-500">Access denied</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full border border-yellow-500/30">Admin</span>
      </div>
      <p className="text-sm text-gray-400">Update match scores. Points are auto-recalculated when status is set to <strong>Completed</strong>.</p>
      <div className="flex flex-wrap gap-3">
        <select value={filterGroup} onChange={e=>setFilterGroup(e.target.value)} className="input py-1.5 text-sm w-auto">
          <option value="">All Groups</option>{GROUPS.map(g=><option key={g} value={g}>Group {g}</option>)}
        </select>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="input py-1.5 text-sm w-auto">
          <option value="">All Statuses</option>
          <option value="scheduled">Scheduled</option><option value="live">Live</option><option value="completed">Completed</option>
        </select>
        <div className="text-sm text-gray-500 self-center">{filtered.length} matches</div>
      </div>
      {isLoading && <div className="text-center py-8 text-gray-500">Loading…</div>}
      {!isLoading && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="border-b border-[#30363d]"><tr className="text-xs text-gray-500 uppercase">
              <th className="text-left px-3 py-2">Match</th><th className="text-left px-3 py-2">Teams</th>
              <th className="text-left px-3 py-2">Date</th><th className="text-left px-3 py-2">Score</th>
              <th className="text-left px-3 py-2">Status</th><th className="text-left px-3 py-2">Action</th>
            </tr></thead>
            <tbody>{filtered.sort((a,b)=>a.match_number-b.match_number).map(m=><ScoreRow key={m.id} match={m} onUpdated={()=>qc.invalidateQueries({queryKey:['matches']})} />)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
