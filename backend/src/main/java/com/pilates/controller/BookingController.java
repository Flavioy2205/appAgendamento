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
            final java.time.LocalDate finalBookingDate = bookingDate;
            
            // Verificação de dupla marcação
            boolean alreadyBooked = slot.getBookings().stream().anyMatch(b -> 
                b.getUser().getId().equals(userId) && 
                (b.isRecurring() || (finalBookingDate != null && finalBookingDate.equals(b.getBookingDate())))
            );

            if (alreadyBooked) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Você já está agendado neste horário."));
            }

            Booking booking = new Booking(user, slot, isRecurring, bookingDate);
            bookingRepository.save(booking);
            return ResponseEntity.ok(Map.of("message", "Agendado com sucesso"));
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
}
