package com.pilates.dto;
import lombok.Data;
import java.time.LocalTime;
import java.util.List;

@Data
public class TimeSlotDTO {
    private Long id;
    private String dayOfWeek;
    private LocalTime startTime;
    private int capacity;
    private List<BookingDTO> bookings;
}
