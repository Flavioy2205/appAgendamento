package com.pilates.controller;

import com.pilates.dto.TimeSlotDTO;
import com.pilates.model.Booking;
import com.pilates.model.TimeSlot;
import com.pilates.model.User;
import com.pilates.repository.BookingRepository;
import com.pilates.repository.TimeSlotRepository;
import com.pilates.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class BookingController {

    @Autowired
    private TimeSlotRepository timeSlotRepository;

    @Autowired
    private BookingRepository bookingRepository;
    
    @Autowired
    private UserRepository userRepository;

    @GetMapping("/timeslots")
    public List<TimeSlotDTO> getAllTimeSlots() {
        return timeSlotRepository.findAll().stream().map(slot -> {
            TimeSlotDTO dto = new TimeSlotDTO();
            dto.setId(slot.getId());
            dto.setDayOfWeek(slot.getDayOfWeek().toString());
            dto.setStartTime(slot.getStartTime());
            dto.setCapacity(slot.getCapacity());
            dto.setBookings(slot.getBookings().stream()
                    .map(b -> new com.pilates.dto.BookingDTO(
                            b.getId(),
                            b.getUser().getId(),
                            b.getUser().getName(),
                            b.isRecurring(),
                            b.getBookingDate()))
                    .collect(Collectors.toList()));
            return dto;
        }).collect(Collectors.toList());
    }

    @PostMapping("/bookings")
    public ResponseEntity<?> createBooking(@RequestBody Map<String, Object> payload) {
        Long timeSlotId = Long.valueOf(payload.get("timeSlotId").toString());
        Long userId = Long.valueOf(payload.get("userId").toString());
        
        boolean isRecurring = true;
        java.time.LocalDate bookingDate = null;
        if(payload.containsKey("isRecurring")) {
            isRecurring = Boolean.parseBoolean(payload.get("isRecurring").toString());
        }
        if(payload.containsKey("bookingDate") && payload.get("bookingDate") != null) {
            bookingDate = java.time.LocalDate.parse(payload.get("bookingDate").toString());
        }

        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Usuário não encontrado."));
        }
        
        User user = userOpt.get();
        Optional<TimeSlot> slotOpt = timeSlotRepository.findById(timeSlotId);
        if (slotOpt.isPresent()) {
            TimeSlot slot = slotOpt.get();
            final java.time.LocalDate finalBookingDate = bookingDate != null ? bookingDate : java.time.LocalDate.now();
            
            if (isRecurring) {
                java.time.LocalDate recurringStartDate = finalBookingDate;
                while (recurringStartDate.isBefore(java.time.LocalDate.now())) {
                    recurringStartDate = recurringStartDate.plusWeeks(1);
                }

                int limit = user.getWeeklyLimit() > 0 ? user.getWeeklyLimit() : 1;
                int occ = user.getTotalClasses() / limit;
                if(occ == 0) occ = user.getTotalClasses();
                if(occ == 0) occ = 1;
                
                int successfulBookings = 0;
                for (int i = 0; i < occ; i++) {
                    java.time.LocalDate currentD = recurringStartDate.plusWeeks(i);
                    boolean alreadyBooked = slot.getBookings().stream().anyMatch(b -> 
                        b.getUser().getId().equals(userId) && 
                        (b.getBookingDate() != null && b.getBookingDate().equals(currentD))
                    );
                    if (!alreadyBooked) {
                        Booking booking = new Booking(user, slot, true, currentD);
                        bookingRepository.save(booking);
                        successfulBookings++;
                    }
                }
                
                if (successfulBookings == 0) {
                     return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Você já estava agendado nestes horários recorrentes."));
                }
                return ResponseEntity.ok(Map.of("message", "Agendado como recorrente por " + successfulBookings + " semanas a partir de " + java.time.format.DateTimeFormatter.ofPattern("dd/MM").format(recurringStartDate) + "."));
            } else {
                // Verificação de dupla marcação simples
                boolean alreadyBooked = slot.getBookings().stream().anyMatch(b -> 
                    b.getUser().getId().equals(userId) && 
                    (b.getBookingDate() != null && b.getBookingDate().equals(finalBookingDate))
                );

                if (alreadyBooked) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Você já está agendado neste horário nesta data."));
                }

                Booking booking = new Booking(user, slot, false, finalBookingDate);
                bookingRepository.save(booking);
                return ResponseEntity.ok(Map.of("message", "Agendado o dia com sucesso"));
            }
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Horário não encontrado."));
    }

    @DeleteMapping("/bookings/{id}")
    public ResponseEntity<?> cancelBooking(@PathVariable Long id) {
        Optional<Booking> bookingOpt = bookingRepository.findById(id);
        if (bookingOpt.isPresent()) {
            bookingRepository.delete(bookingOpt.get());
            return ResponseEntity.ok(Map.of("message", "Agendamento cancelado com sucesso!"));
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Agendamento não encontrado."));
    }

    @DeleteMapping("/admin/bookings/date/{date}")
    public ResponseEntity<?> cancelAllBookingsOnDate(@PathVariable String date) {
        java.time.LocalDate targetDate = java.time.LocalDate.parse(date);
        List<Booking> toDelete = bookingRepository.findAll().stream()
                .filter(b -> b.getBookingDate() != null && b.getBookingDate().equals(targetDate))
                .collect(Collectors.toList());
        
        int count = toDelete.size();
        bookingRepository.deleteAll(toDelete);
        
        return ResponseEntity.ok(Map.of("message", "Foram cancelados " + count + " agendamentos para a data " + date + ". As cotas dos alunos foram liberadas."));
    }
}
