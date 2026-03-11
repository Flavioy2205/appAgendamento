import { useEffect, useState } from 'react';
import './App.css';

interface User {
  id: number;
  cpf: string;
  name: string;
  role: string;
  weeklyLimit: number;
  totalClasses: number;
  active: boolean;
}

interface Booking {
  id: number;
  userId: number;
  userName: string;
  isRecurring?: boolean;
  recurring?: boolean;
  bookingDate: string | null;
}

interface TimeSlot {
  id: number;
  dayOfWeek: string;
  startTime: string;
  capacity: number;
  bookings: Booking[];
}

const dayMap: Record<string, string> = {
  MONDAY: 'Segunda-feira',
  TUESDAY: 'Terça-feira',
  WEDNESDAY: 'Quarta-feira',
  THURSDAY: 'Quinta-feira',
  FRIDAY: 'Sexta-feira',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo'
};

const dayOrderMap: Record<string, number> = {
  MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6, SUNDAY: 7
};

const getNextDateForDayAndTime = (dayOfWeekStr: string, timeStr: string) => {
  const dayIndexMap: Record<string, number> = { MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6, SUNDAY: 0 };
  const targetDay = dayIndexMap[dayOfWeekStr];
  const now = new Date();
  const currentDay = now.getDay();
  
  let diff = targetDay - currentDay;
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  if (diff === 0) {
    if (now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= minutes)) {
      diff += 7;
    }
  } else if (diff < 0) {
    diff += 7;
  }
  
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + diff);
  targetDate.setHours(hours, minutes, 0, 0);
  return targetDate;
};

const getWeeklyDateForDay = (dayOfWeekStr: string, weekOffset: number = 0) => {
  const dayIndexMap: Record<string, number> = { MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6, SUNDAY: 0 };
  const targetDay = dayIndexMap[dayOfWeekStr];
  const now = new Date();
  
  // Standardize current day where Sunday is 0 
  let diff = targetDay - now.getDay();
  if (diff < 0) diff += 7; // Ensure we are looking at the current/next occurrence of this week

  // Add the week offset
  diff += weekOffset * 7;
  
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + diff);
  return targetDate;
};

const getIsoDateForDay = (dayOfWeekStr: string, weekOffset: number = 0) => {
  const d = getWeeklyDateForDay(dayOfWeekStr, weekOffset);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (date: Date) => {
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
};

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Login State
  const [loginCpf, setLoginCpf] = useState('');
  const [loginError, setLoginError] = useState('');

  // Admin State (Users)
  const [newCpf, setNewCpf] = useState('');
  const [newName, setNewName] = useState('');
  const [newLimit, setNewLimit] = useState(2);
  const [newTotalClasses, setNewTotalClasses] = useState(0);
  const [adminMsg, setAdminMsg] = useState('');

  // Admin State (Schedules)
  const [scheduleMsg, setScheduleMsg] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

  // Booking State
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [expandedSlotId, setExpandedSlotId] = useState<number | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // Admin Panel State
  const [adminTab, setAdminTab] = useState<'ALUNOS' | 'GRADE'>('ALUNOS');
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/timeslots');
      const data = await res.json();
      setTimeSlots(data);
    } catch (error) {
      console.error('Failed to fetch slots:', error);
      setErrorMsg('Erro ao carregar horários. Verifique se o servidor está rodando.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setAllUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'ALUNO' || currentUser?.role === 'ADMIN') {
      fetchSlots();
    }
    if (currentUser?.role === 'ADMIN') {
      fetchUsers();
    }
  }, [currentUser]);

  const toggleUserActive = async (user: User) => {
     try {
       const endpoint = user.active ? `/api/users/${user.id}/deactivate` : `/api/users/${user.id}/reactivate`;
       await fetch(endpoint, { method: 'PUT' });
       fetchUsers();
     } catch(e) { console.error(e); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: loginCpf.replace(/\D/g, '') })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'CPF não encontrado ou erro de acesso');
      }
      const user = await res.json();
      setCurrentUser(user);
    } catch (error: any) {
      setLoginError(error.message);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginCpf('');
    setAdminMsg('');
    setErrorMsg('');
    setScheduleMsg('');
  };

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminMsg('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cpf: newCpf.replace(/\D/g, ''), 
          name: newName,
          weeklyLimit: newLimit,
          totalClasses: newTotalClasses
        })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erro ao cadastrar');
      }
      setAdminMsg('Usuário cadastrado com sucesso!');
      setNewCpf('');
      setNewName('');
      setNewLimit(2);
      setNewTotalClasses(0);
      fetchUsers();
    } catch (error: any) {
      setAdminMsg(error.message);
    }
  };

  const handleToggleDayOpen = async (day: string, isOpen: boolean) => {
    setLoading(true);
    setScheduleMsg('');
    try {
      if (isOpen) {
         const slotsOfThisDay = timeSlots.filter(s => s.dayOfWeek === day);
         await Promise.all(slotsOfThisDay.map(s => 
            fetch(`/api/admin/timeslots/${s.id}`, { method: 'DELETE' })
         ));
         setScheduleMsg(`A agenda para ${dayMap[day]} foi fechada.`);
      } else {
         const res = await fetch('/api/admin/timeslots/bulk', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ activeDays: [day], capacity: 3 })
         });
         if (!res.ok) throw new Error('Erro ao abrir agenda');
         setScheduleMsg(`A agenda para ${dayMap[day]} foi aberta (08h às 20h).`);
      }
      await fetchSlots();
    } catch(e: any) {
      console.error(e);
      setScheduleMsg(e.message || 'Erro ao atualizar a agenda para o dia selecionado.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSingleSlot = async (day: string, hour: number, existingSlot?: TimeSlot) => {
    setLoading(true);
    setScheduleMsg('');
    try {
      if (existingSlot) {
        const res = await fetch(`/api/admin/timeslots/${existingSlot.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao remover horário.');
        setScheduleMsg(`Horário das ${hour.toString().padStart(2, '0')}:00 fechado.`);
      } else {
        const startTimeStr = `${hour.toString().padStart(2, '0')}:00`;
        const res = await fetch('/api/admin/timeslots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dayOfWeek: day, startTime: startTimeStr, capacity: 3 })
        });
        if (!res.ok) throw new Error('Erro ao adicionar horário.');
        setScheduleMsg(`Horário das ${hour.toString().padStart(2, '0')}:00 aberto.`);
      }
      await fetchSlots();
    } catch(e: any) {
      console.error(e);
      setScheduleMsg(e.message || 'Erro ao organizar a agenda.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelHoliday = async () => {
    if (!holidayDate) {
      setScheduleMsg('Selecione uma data para o feriado.');
      return;
    }
    const conf = window.confirm(`Deseja realmente cancelar TODOS os agendamentos do dia ${holidayDate.split('-').reverse().join('/')}? \nAtenção: essa ação irá limpar a agenda desse dia específico e não apagará os horários da sua grade padrão.`);
    if (!conf) return;

    setLoading(true);
    setScheduleMsg('');
    try {
      const res = await fetch(`/api/admin/bookings/date/${holidayDate}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao processar o cancelamento do feriado.');
      const data = await res.json();
      setScheduleMsg(data.message || 'Feriado processado com sucesso.');
      setHolidayDate('');
      await fetchSlots();
    } catch(e: any) {
      console.error(e);
      setScheduleMsg(e.message || 'Erro ao cancelar aulas.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTimeSlot = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/timeslots/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        throw new Error('Erro ao deletar');
      }
      await fetchSlots();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleBook = async (timeSlotId: number, isRecurring: boolean, bookingDate: string | null) => {
    if (!currentUser) return;
    try {
      setBookingLoading(true);
      setErrorMsg('');
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeSlotId, userId: currentUser.id, isRecurring, bookingDate })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erro ao agendar');
      }
      await fetchSlots();
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelBooking = async (slot: TimeSlot) => {
    if (!currentUser) return;
    
    const nextOccurrence = getNextDateForDayAndTime(slot.dayOfWeek, formatTime(slot.startTime));
    const now = new Date();
    const diffHours = (nextOccurrence.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 2) {
      const conf = window.confirm("ATENÇÃO: A sua próxima aula formatada neste horário ocorre em menos de 2h. \nSe você cancelar agora, isso será contabilizado como FALTA em seu contrato. Deseja cancelar mesmo assim?");
      if (!conf) return;
    } else {
      const conf = window.confirm("Deseja realmente cancelar este agendamento?");
      if (!conf) return;
    }

    try {
      setBookingLoading(true);
      setErrorMsg('');
      const activeBookings = getActiveBookingsForSlot(slot);
      const myBooking = activeBookings.find(b => b.userId === currentUser.id);
      if (!myBooking) {
         throw new Error('Você não possui agendamento ativo neste horário.');
      }
      
      const res = await fetch(`/api/bookings/${myBooking.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Erro ao cancelar');
      }
      await fetchSlots();
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5);
  };

  const getActiveBookingsForSlot = (slot: TimeSlot) => {
     const isoDate = getIsoDateForDay(slot.dayOfWeek, weekOffset);
     return slot.bookings.filter(b => b.bookingDate === isoDate);
  };

  // Group slots by day
  const groupedSlots = timeSlots.reduce((acc, slot) => {
    if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = [];
    acc[slot.dayOfWeek].push(slot);
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  // Sort days
  const sortedDays = Object.keys(groupedSlots).sort((a, b) => dayOrderMap[a] - dayOrderMap[b]);

  // Calculate user current bookings count
  const userBookingsCount = timeSlots.reduce((count, slot) => {
    if (!currentUser) return count;
    const active = getActiveBookingsForSlot(slot);
    if (active.some(b => b.userId === currentUser.id)) {
      return count + 1;
    }
    return count;
  }, 0);

  const userRecurringBookings = timeSlots.filter(slot => {
     if (!currentUser) return false;
     return slot.bookings.some(b => b.userId === currentUser.id && (b.isRecurring || b.recurring));
  });

  const getUserBookedClassesForCurrentWeek = (userId: number) => {
    let count = 0;
    timeSlots.forEach(slot => {
       const active = getActiveBookingsForSlot(slot);
       count += active.filter(b => b.userId === userId).length;
    });
    return count;
  };

  return (
    <>
      <div className="app-container fade-in">
        {currentUser && (
          <div className="top-nav-bar" style={{flexDirection: 'column', alignItems: 'flex-start'}}>
            <div style={{display: 'flex', width: '100%', justifyContent: 'space-between'}}>
              {currentUser.role === 'ALUNO' ? (
                 <span className="welcome-text">
                   Olá, <strong>{currentUser.name}</strong> 
                   <span className="limit-info"> ( {userBookingsCount} / {currentUser.weeklyLimit} aulas na semana )</span>
                 </span>
              ) : (
                 <span className="welcome-text">Olá, <strong>{currentUser.name}</strong> (Administrador)</span>
              )}
              
              <button className="logout-btn" onClick={handleLogout}>
                Desconectar
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '6px'}}>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </button>
            </div>
            
            {currentUser.role === 'ALUNO' && (
              <div className="recurring-banner" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <strong>Aulas totais no contrato:</strong> {currentUser.totalClasses}
                  <span style={{marginLeft: '20px'}}>
                     <strong>Uso da Semana:</strong> {userBookingsCount} / {currentUser.weeklyLimit}
                  </span>
                </div>
                {userRecurringBookings.length > 0 && (
                  <div style={{marginTop: '5px', fontSize: '0.9rem', color: 'var(--danger-color)'}}>
                     Lembrete: Você tem agendamento(s) recorrente(s) de
                    <strong>
                      {userRecurringBookings.map(slot => ` ${dayMap[slot.dayOfWeek]} às ${formatTime(slot.startTime)}`).join(', ')}
                    </strong>
                    . Isso consome automaticamente {userRecurringBookings.length} aula(s) da sua cota da semana.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <header className="header">
          <h1>Clinmult Pilates Studio</h1>
          {!currentUser && <p>Faça login para continuar.</p>}
        </header>

        {/* Login Area */}
        {!currentUser && (
          <div className="login-area glass-panel fade-in">
            <h2>Login</h2>
            {loginError && <div className="error-msg">{loginError}</div>}
            <form onSubmit={handleLogin} className="modal-form">
              <div className="form-group">
                <label>CPF (Apenas números)</label>
                <input 
                  type="text" 
                  value={loginCpf}
                  onChange={(e) => setLoginCpf(e.target.value)}
                  placeholder="Ex: 11111111111"
                  required
                />
              </div>
              <button type="submit" className="confirm-btn" style={{marginTop: '10px'}}>Entrar</button>
            </form>
          </div>
        )}

        {/* Admin Area */}
        {currentUser?.role === 'ADMIN' && (
          <div className="admin-container fade-in" style={{marginBottom: '20px'}}>
             <div className="admin-tabs" style={{display: 'flex', gap: '40px', marginBottom: '30px', justifyContent: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0'}}>
                <button 
                  style={{
                    width: 'auto', 
                    padding: '10px 0px', 
                    fontSize: '1.2rem',
                    fontWeight: adminTab === 'ALUNOS' ? 'bold' : 'normal',
                    backgroundColor: 'transparent', 
                    color: adminTab === 'ALUNOS' ? 'var(--text-primary)' : 'var(--text-secondary)', 
                    border: 'none',
                    borderBottom: adminTab === 'ALUNOS' ? '3px solid var(--accent-color)' : '3px solid transparent',
                    borderRadius: '0',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    marginBottom: '-1px'
                  }}
                  onClick={() => setAdminTab('ALUNOS')}
                >
                  Gestão de Alunos
                </button>
                <button 
                  style={{
                    width: 'auto', 
                    padding: '10px 0px', 
                    fontSize: '1.2rem',
                    fontWeight: adminTab === 'GRADE' ? 'bold' : 'normal',
                    backgroundColor: 'transparent', 
                    color: adminTab === 'GRADE' ? 'var(--text-primary)' : 'var(--text-secondary)', 
                    border: 'none',
                    borderBottom: adminTab === 'GRADE' ? '3px solid var(--accent-color)' : '3px solid transparent',
                    borderRadius: '0',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    marginBottom: '-1px'
                  }}
                  onClick={() => setAdminTab('GRADE')}
                >
                  Gestão da Grade & Horários
                </button>
             </div>

             {adminTab === 'ALUNOS' && (
               <div className="admin-grid" style={{alignItems: 'start'}}>
                 <div className="admin-area glass-panel fade-in">
                   <h2>Cadastrar Aluno</h2>
                   {adminMsg && <div className={adminMsg.includes('sucesso') ? 'success-msg' : 'error-msg'}>{adminMsg}</div>}
                   <form onSubmit={handleRegisterUser} className="modal-form">
                     <div className="form-group">
                       <label>CPF (Apenas números)</label>
                       <input 
                         type="text" 
                         value={newCpf}
                         onChange={(e) => setNewCpf(e.target.value)}
                         required 
                       />
                     </div>
                     <div className="form-group">
                       <label>Nome Completo</label>
                       <input 
                         type="text" 
                         value={newName}
                         onChange={(e) => setNewName(e.target.value)}
                         required 
                       />
                     </div>
                     <div className="form-group">
                       <label>Aulas por Semana (Limite)</label>
                       <input 
                         type="number" 
                         min="1" max="10"
                         value={newLimit}
                         onChange={(e) => setNewLimit(Number(e.target.value))}
                         required 
                       />
                     </div>
                     <div className="form-group">
                       <label>Total de Aulas Fechadas (Contrato)</label>
                       <input 
                         type="number" 
                         min="1" max="300"
                         value={newTotalClasses}
                         onChange={(e) => setNewTotalClasses(Number(e.target.value))}
                         required 
                       />
                     </div>
                      <button type="submit" className="confirm-btn" style={{marginTop: '10px'}}>Cadastrar</button>
                   </form>
                 </div>

                 <div className="admin-area glass-panel fade-in" style={{maxHeight: '600px', overflowY: 'auto'}}>
                   <h2>Alunos Cadastrados</h2>
                   <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                     {allUsers.filter(u => u.role === 'ALUNO').length === 0 ? (
                       <p style={{textAlign: 'center', color: 'var(--text-secondary)'}}>Nenhum aluno cadastrado.</p>
                     ) : (
                       allUsers.filter(u => u.role === 'ALUNO').map(u => (
                          <div key={u.id} style={{padding: '15px', backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: u.active ? 1 : 0.6}}>
                             <div>
                                <strong style={{display: 'block', fontSize: '1.2rem', color: u.active ? 'var(--text-primary)' : 'var(--text-secondary)'}}>{u.name}{!u.active && ' (Inativo)'}</strong>
                                <span style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Contrato: {u.totalClasses} aulas | Agendadas na semana: {getUserBookedClassesForCurrentWeek(u.id)} / {u.weeklyLimit}</span>
                             </div>
                             <button 
                                onClick={() => toggleUserActive(u)}
                                style={{padding: '8px 12px', borderRadius: '4px', border: 'none', backgroundColor: u.active ? '#ef4444' : '#10b981', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap'}}
                             >
                                {u.active ? 'Inativar' : 'Reativar'}
                             </button>
                          </div>
                       ))
                     )}
                   </div>
                 </div>
               </div>
             )}

             {adminTab === 'GRADE' && (
               <div className="admin-grid" style={{justifyContent: 'center', maxWidth: '800px', margin: '0 auto'}}>
                 <div className="admin-area glass-panel fade-in" style={{width: '100%'}}>
                   <h2 style={{textAlign: 'center', marginBottom: '10px'}}>Gestão de Feriados e Exceções</h2>
                   <p style={{marginBottom: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center'}}>
                     Selecione uma data específica (ex: Feriado) para <strong>cancelar todas as aulas daquele dia</strong>. <br/>
                     O sistema cancelará as marcações mantendo sua grade intacta, e a cota dos alunos será devolvida no ato.
                   </p>
                   
                   <div style={{display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center', marginBottom: '30px', padding: '20px', backgroundColor: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'}}>
                      <div className="form-group" style={{marginBottom: 0, width: '200px'}}>
                         <input 
                            type="date" 
                            value={holidayDate}
                            onChange={(e) => setHolidayDate(e.target.value)}
                            style={{width: '100%', cursor: 'pointer'}}
                         />
                      </div>
                      <button 
                         onClick={handleCancelHoliday}
                         disabled={loading || !holidayDate}
                         style={{
                           padding: '12px 24px', 
                           borderRadius: '8px', 
                           border: 'none', 
                           backgroundColor: 'var(--danger-color)', 
                           color: 'white', 
                           fontWeight: 'bold', 
                           cursor: loading || !holidayDate ? 'not-allowed' : 'pointer',
                           transition: 'all 0.2s',
                           opacity: loading || !holidayDate ? 0.6 : 1,
                           display: 'flex',
                           alignItems: 'center',
                           gap: '8px'
                         }}
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                         Cancelar Marcações do Dia
                      </button>
                   </div>
                   
                   <h2 style={{textAlign: 'center', marginBottom: '10px', marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--border-color)'}}>Horários da Grade Padrão</h2>
                   <p style={{marginBottom: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center'}}>
                     Selecione abaixo quais dias da semana estarão abertos ou escolha <strong>horários específicos</strong> individualmente.
                   </p>
                   {scheduleMsg && <div className={scheduleMsg.includes('Erro') || scheduleMsg.includes('fechad') ? 'error-msg' : 'success-msg'} style={{marginBottom: '15px'}}>{scheduleMsg}</div>}
                   <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                     {dayOrder.map(day => {
                        const slotsOfThisDay = timeSlots.filter(s => s.dayOfWeek === day);
                        const isOpen = slotsOfThisDay.length > 0;
                        const hoursRange = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

                        return (
                          <div key={day} style={{padding: '20px', backgroundColor: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)'}}>
                             <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isOpen ? '15px' : '0', borderBottom: isOpen ? '1px solid var(--border-color)' : 'none', paddingBottom: isOpen ? '15px' : '0'}}>
                                <div>
                                   <strong style={{display: 'block', fontSize: '1.2rem', color: isOpen ? 'var(--text-primary)' : 'var(--text-secondary)'}}>{dayMap[day]}</strong>
                                   <span style={{fontSize: '0.85rem', fontWeight: 600, color: isOpen ? 'var(--success-color)' : 'var(--danger-color)'}}>
                                      {isOpen ? `${slotsOfThisDay.length} horários abertos` : 'Agenda fechada'}
                                   </span>
                                </div>
                                <button 
                                   onClick={() => handleToggleDayOpen(day, isOpen)}
                                   disabled={loading}
                                   style={{
                                     padding: '8px 16px', 
                                     borderRadius: '6px', 
                                     border: `1px solid ${isOpen ? 'var(--danger-color)' : 'var(--success-color)'}`, 
                                     backgroundColor: isOpen ? 'transparent' : 'var(--success-color)', 
                                     color: isOpen ? 'var(--danger-color)' : 'white', 
                                     fontWeight: 'bold', 
                                     cursor: loading ? 'not-allowed' : 'pointer',
                                     transition: 'all 0.2s',
                                     width: '160px'
                                   }}
                                >
                                   {isOpen ? 'Fechar Dia Todo' : 'Abrir Agenda 08h-20h'}
                                </button>
                             </div>
                             
                             {isOpen && (
                               <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px'}}>
                                 {hoursRange.map(hour => {
                                    const hStr = `${hour.toString().padStart(2, '0')}:00`;
                                    const exactMatch = `${hStr}:00`;
                                    const existingSlot = slotsOfThisDay.find(s => s.startTime === exactMatch || s.startTime === hStr || s.startTime.startsWith(hStr));
                                    const isSlotOpen = !!existingSlot;
                                    
                                    return (
                                      <button
                                        key={hour}
                                        onClick={() => handleToggleSingleSlot(day, hour, existingSlot)}
                                        disabled={loading}
                                        style={{
                                          padding: '6px 12px',
                                          borderRadius: '20px',
                                          fontSize: '0.9rem',
                                          fontWeight: 600,
                                          border: `1px solid ${isSlotOpen ? 'var(--accent-color)' : 'var(--border-color)'}`,
                                          backgroundColor: isSlotOpen ? 'var(--success-bg)' : 'transparent',
                                          color: isSlotOpen ? 'var(--accent-color)' : 'var(--text-secondary)',
                                          cursor: loading ? 'wait' : 'pointer',
                                          transition: 'all 0.2s',
                                          opacity: loading ? 0.6 : 1
                                        }}
                                        title={isSlotOpen ? `Clique para fechar horário das ${hStr}` : `Clique para abrir horário das ${hStr}`}
                                      >
                                        {hStr}
                                      </button>
                                    );
                                 })}
                               </div>
                             )}
                          </div>
                        );
                     })}
                   </div>
                 </div>
               </div>
             )}
          </div>
        )}

        {/* Schedule Grid Area (For both Aluno and Admin) */}
        {(currentUser?.role === 'ALUNO' || (currentUser?.role === 'ADMIN' && adminTab === 'GRADE')) && (
          <div className="schedule-area fade-in">
            {errorMsg && <div className="error-msg">{errorMsg}</div>}
            
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', padding: '10px 15px', backgroundColor: 'var(--card-bg, #fff)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', position: 'sticky', top: '20px', zIndex: 100, backdropFilter: 'blur(8px)'}}>
               <button 
                  className="book-btn" 
                  style={{padding: '8px 15px', width: 'auto'}} 
                  onClick={() => setWeekOffset(prev => prev - 1)}
               >
                 « Semana Anterior
               </button>
               <span style={{fontWeight: 600, color: 'var(--text-primary)'}}>
                 {weekOffset === 0 ? "Nesta Semana" : weekOffset === 1 ? "Próxima Semana" : weekOffset === -1 ? "Semana Passada" : weekOffset > 1 ? `+${weekOffset} Semanas` : `${Math.abs(weekOffset)} Semanas Atrás`}
               </span>
               <button 
                  className="book-btn" 
                  style={{padding: '8px 15px', width: 'auto'}} 
                  onClick={() => setWeekOffset(prev => prev + 1)}
               >
                 Próxima Semana »
               </button>
            </div>

            {loading ? (
              <div className="loading-spinner">Carregando horários...</div>
            ) : sortedDays.length === 0 ? (
              <div className="loading-spinner">Nenhum horário cadastrado pelo administrador.</div>
            ) : (
              sortedDays.map(dayCode => (
                <div key={dayCode} className="day-section">
                  <h2 className="day-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{dayMap[dayCode]}</span>
                    <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                      Data: {formatDisplayDate(getWeeklyDateForDay(dayCode, weekOffset))}
                    </span>
                  </h2>
                  <div className="slots-grid">
                    {groupedSlots[dayCode].sort((a,b) => a.startTime.localeCompare(b.startTime)).map((slot, index) => {
                      const activeBookings = getActiveBookingsForSlot(slot);
                      const isFull = activeBookings.length >= slot.capacity;
                      const myBooking = activeBookings.find(b => b.userId === currentUser.id);
                      const alreadyBooked = !!myBooking;
                      
                      return (
                        <div 
                          key={slot.id} 
                          className={`glass-panel slot-card fade-in ${(isFull && !alreadyBooked) || (userBookingsCount >= currentUser.weeklyLimit && !alreadyBooked && currentUser.role === 'ALUNO') ? 'disabled' : ''}`}
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <div className="slot-header">
                            <span className="slot-time">{formatTime(slot.startTime)}</span>
                            {currentUser.role === 'ADMIN' && (
                               <button className="del-btn" onClick={() => handleDeleteTimeSlot(slot.id)}>X</button>
                            )}
                          </div>
                          
                          <div className={`slot-capacity ${isFull ? 'full' : 'available'}`}>
                            {activeBookings.length} / {slot.capacity} vagas
                          </div>
                          
                          <div className="booked-users">
                            {activeBookings.map((b, i) => (
                              <div key={i} className={`user-pill ${b.userId === currentUser.id ? 'current-user-pill' : ''}`}>
                                {b.userName} {(b.isRecurring || b.recurring) && '(Fixo)'}
                              </div>
                            ))}
                          </div>

                          {currentUser.role === 'ALUNO' && !alreadyBooked && expandedSlotId === slot.id && (
                            <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto'}} className="fade-in">
                              <button 
                                className="book-btn"
                                onClick={() => { handleBook(slot.id, false, getIsoDateForDay(slot.dayOfWeek, weekOffset)); setExpandedSlotId(null); }}
                                disabled={isFull || bookingLoading || userBookingsCount >= currentUser.weeklyLimit}
                              >
                                {userBookingsCount >= currentUser.weeklyLimit ? 'Limite Atingido' : isFull ? 'Esgotado' : (bookingLoading ? 'Agendando...' : `Apenas Dia ${formatDisplayDate(getWeeklyDateForDay(dayCode, weekOffset))}`)}
                              </button>

                              <button 
                                className="book-recurring-btn cancel-book-btn"
                                onClick={() => { handleBook(slot.id, true, getIsoDateForDay(slot.dayOfWeek, weekOffset)); setExpandedSlotId(null); }}
                                disabled={isFull || bookingLoading || userBookingsCount >= currentUser.weeklyLimit}
                              >
                                {userBookingsCount >= currentUser.weeklyLimit ? 'Limite Atingido' : isFull ? 'Esgotado' : (bookingLoading ? 'Processando...' : 'Fixo Toda Semana')}
                              </button>

                              <button 
                                className="cancel-book-btn"
                                style={{backgroundColor: '#e2e8f0', color: '#1e293b'}}
                                onClick={() => setExpandedSlotId(null)}
                              >
                                Cancelar
                              </button>
                            </div>
                          )}

                          {currentUser.role === 'ALUNO' && !alreadyBooked && expandedSlotId !== slot.id && (
                            <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto'}}>
                              <button 
                                className="book-btn"
                                onClick={() => setExpandedSlotId(slot.id)}
                                disabled={isFull || bookingLoading || userBookingsCount >= currentUser.weeklyLimit}
                                style={{padding: '12px'}}
                              >
                                {userBookingsCount >= currentUser.weeklyLimit ? 'Limite Atingido' : isFull ? 'Esgotado' : (bookingLoading ? 'Agendando...' : 'Agendar')}
                              </button>
                            </div>
                          )}
                          
                          {currentUser.role === 'ALUNO' && alreadyBooked && (
                            <div className="already-booked-container">
                              <span className="already-booked-msg" style={{display: 'block', marginBottom: '8px'}}>✓ Você está agendado {(myBooking.isRecurring || myBooking.recurring) && '(Fixo)'}</span>
                              <button 
                                className="cancel-book-btn" 
                                onClick={() => handleCancelBooking(slot)}
                                disabled={bookingLoading}
                              >
                                {bookingLoading ? 'Processando...' : 'Cancelar Minha Vaga'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default App;
