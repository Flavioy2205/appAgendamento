package com.pilates.controller;

import com.pilates.model.TimeSlot;
import com.pilates.repository.TimeSlotRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class TimeSlotController {

    @Autowired
    private TimeSlotRepository timeSlotRepository;

    @PostMapping("/timeslots")
    public ResponseEntity<?> createTimeSlot(@RequestBody Map<String, Object> payload) {
        String dayStr = payload.get("dayOfWeek").toString();
        String timeStr = payload.get("startTime").toString();
        int capacity = payload.containsKey("capacity") ? Integer.parseInt(payload.get("capacity").toString()) : 3;

        TimeSlot slot = new TimeSlot(DayOfWeek.valueOf(dayStr), LocalTime.parse(timeStr));
        slot.setCapacity(capacity);
        timeSlotRepository.save(slot);

        return ResponseEntity.ok(Map.of("message", "Horário criado com sucesso", "id", slot.getId()));
    }
    
    @PostMapping("/timeslots/bulk")
    public ResponseEntity<?> createBulkTimeSlots(@RequestBody Map<String, Object> payload) {
        @SuppressWarnings("unchecked")
        List<String> activeDays = (List<String>) payload.get("activeDays");
        if (activeDays == null || activeDays.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Nenhum dia selecionado."));
        }

        int capacity = payload.containsKey("capacity") ? Integer.parseInt(payload.get("capacity").toString()) : 3;
        int added = 0;

        for(String dayStr : activeDays) {
            DayOfWeek day = DayOfWeek.valueOf(dayStr);
            for(int hour = 8; hour <= 20; hour++) {
                LocalTime lTime = LocalTime.of(hour, 0);
                
                if (!timeSlotRepository.existsByDayOfWeekAndStartTime(day, lTime)) {
                    TimeSlot slot = new TimeSlot(day, lTime);
                    slot.setCapacity(capacity);
                    timeSlotRepository.save(slot);
                    added++;
                }
            }
        }
        return ResponseEntity.ok(Map.of("message", "Grade Padrão gerada com sucesso! Foram adicionados " + added + " novos horários."));
    }
    
    @DeleteMapping("/timeslots/{id}")
    public ResponseEntity<?> deleteTimeSlot(@PathVariable Long id) {
        if(timeSlotRepository.existsById(id)) {
             timeSlotRepository.deleteById(id);
             return ResponseEntity.ok(Map.of("message", "Horário removido."));
        }
        return ResponseEntity.notFound().build();
    }
}
