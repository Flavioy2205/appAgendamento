package com.pilates.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@NoArgsConstructor
public class Booking {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "time_slot_id", nullable = false)
    private TimeSlot timeSlot;

    @Column(nullable = false)
    private boolean isRecurring = true;

    @Column(nullable = true)
    private java.time.LocalDate bookingDate;
    
    public Booking(User user, TimeSlot timeSlot) {
        this.user = user;
        this.timeSlot = timeSlot;
        this.isRecurring = true;
    }

    public Booking(User user, TimeSlot timeSlot, boolean isRecurring, java.time.LocalDate bookingDate) {
        this.user = user;
        this.timeSlot = timeSlot;
        this.isRecurring = isRecurring;
        this.bookingDate = bookingDate;
    }
}
