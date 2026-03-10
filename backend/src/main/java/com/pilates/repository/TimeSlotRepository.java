package com.pilates.repository;

import com.pilates.model.TimeSlot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.DayOfWeek;
import java.time.LocalTime;

public interface TimeSlotRepository extends JpaRepository<TimeSlot, Long> {
    boolean existsByDayOfWeekAndStartTime(DayOfWeek dayOfWeek, LocalTime startTime);
}
