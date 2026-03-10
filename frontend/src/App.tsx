import { useEffect, useState } from 'react';
import './App.css';

interface User {
  id: number;
  cpf: string;
  name: string;
  role: string;
  weeklyLimit: number;
  totalClasses: number;
}

interface Booking {
  id: number;
  userId: number;
  userName: string;
  isRecurring: boolean;
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

const getWeeklyDateForDay = (dayOfWeekStr: string) => {
  const dayIndexMap: Record<string, number> = { MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6, SUNDAY: 0 };
  const targetDay = dayIndexMap[dayOfWeekStr];
  const now = new Date();
  
  // Standardize current day where Sunday is 0 
  let diff = targetDay - now.getDay();
  if (diff < 0) diff += 7; // Ensure we are looking at the current/next occurrence of this week
  
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + diff);
  return targetDate;
};

const getIsoDateForDay = (dayOfWeekStr: string) => {
  const d = getWeeklyDateForDay(dayOfWeekStr);
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
  const [bulkDays, setBulkDays] = useState<string[]>(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
  const [scheduleMsg, setScheduleMsg] = useState('');

  // Booking State
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [expandedSlotId, setExpandedSlotId] = useState<number | null>(null);

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

  useEffect(() => {
    if (currentUser?.role === 'ALUNO' || currentUser?.role === 'ADMIN') {
      fetchSlots();
    }
  }, [currentUser]);

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
        throw new Error('CPF não encontrado');
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
    } catch (error: any) {
      setAdminMsg(error.message);
    }
  };

  const toggleBulkDay = (day: string) => {
    setBulkDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleCreateBulkSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleMsg('');
    try {
      if (bulkDays.length === 0) {
        throw new Error('Selecione ao menos um dia.');
      }
      const res = await fetch('/api/admin/timeslots/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeDays: bulkDays, capacity: 3 })
      });
      if (!res.ok) {
        throw new Error('Erro ao criar horários agrupados');
      }
      const respData = await res.json();
      setScheduleMsg(respData.message || 'Lote criado com sucesso!');
      await fetchSlots();
    } catch (error: any) {
      setScheduleMsg(error.message);
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
     const isoDate = getIsoDateForDay(slot.dayOfWeek);
     return slot.bookings.filter(b => b.isRecurring || b.bookingDate === isoDate);
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
     return slot.bookings.some(b => b.userId === currentUser.id && b.isRecurring);
  });

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
                  <div style={{marginTop: '5px', fontSize: '0.9rem', color: '#1e40af'}}>
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
          <div className="admin-grid">
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

            <div className="admin-area glass-panel fade-in">
              <h2>Gerenciar Grade Padrão</h2>
              <p style={{marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
                Gera aulas em todos os dias selecionados, sempre das 08h até as 20h. 
                Desmarque os dias em que a clínica não funcionará.
              </p>
              {scheduleMsg && <div className={scheduleMsg.includes('sucesso') ? 'success-msg' : 'error-msg'}>{scheduleMsg}</div>}
              <form onSubmit={handleCreateBulkSlots} className="modal-form" style={{paddingRight: '10px'}}>
                <div className="form-group" style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map(day => (
                     <label key={day} style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'normal'}}>
                        <input 
                          type="checkbox" 
                          checked={bulkDays.includes(day)}
                          onChange={() => toggleBulkDay(day)}
                          style={{width: 'auto'}}
                        /> 
                        {dayMap[day]}
                     </label>
                  ))}
                  
                </div>
                <button type="submit" className="confirm-btn" style={{marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'}}>
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                   Gerar Horários (08h às 20h)
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Schedule Grid Area (For both Aluno and Admin) */}
        {currentUser && (
          <div className="schedule-area fade-in">
            {errorMsg && <div className="error-msg">{errorMsg}</div>}
            
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
                      Semana Atual: {formatDisplayDate(getWeeklyDateForDay(dayCode))}
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
                                {b.userName} {b.isRecurring && '(Fixo)'}
                              </div>
                            ))}
                          </div>

                          {currentUser.role === 'ALUNO' && !alreadyBooked && expandedSlotId === slot.id && (
                            <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto'}} className="fade-in">
                              <button 
                                className="book-btn"
                                onClick={() => { handleBook(slot.id, false, getIsoDateForDay(slot.dayOfWeek)); setExpandedSlotId(null); }}
                                disabled={isFull || bookingLoading || userBookingsCount >= currentUser.weeklyLimit}
                              >
                                {userBookingsCount >= currentUser.weeklyLimit ? 'Limite Atingido' : isFull ? 'Esgotado' : (bookingLoading ? 'Agendando...' : `Apenas Dia ${formatDisplayDate(getWeeklyDateForDay(dayCode))}`)}
                              </button>

                              <button 
                                className="book-recurring-btn cancel-book-btn"
                                onClick={() => { handleBook(slot.id, true, null); setExpandedSlotId(null); }}
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
                              <span className="already-booked-msg" style={{display: 'block', marginBottom: '8px'}}>✓ Você está agendado {myBooking.isRecurring && '(Fixo)'}</span>
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
