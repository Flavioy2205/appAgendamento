package com.pilates.repository;

import com.pilates.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    long countByUserId(Long userId);
    Optional<Booking> findByTimeSlotIdAndUserId(Long timeSlotId, Long userId);
}
