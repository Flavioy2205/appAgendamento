package com.pilates.service;

import com.pilates.model.Booking;
import com.pilates.repository.BookingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class ReminderScheduler {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private WhatsappService whatsappService;

    // Roda todos os dias as 08h00 da manha
    @Scheduled(cron = "0 0 8 * * ?")
    public void sendDailyReminders() {
        System.out.println("Running daily WhatsApp reminder jobs...");
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        
        List<Booking> tomorrowBookings = bookingRepository.findAll().stream()
                .filter(b -> b.getBookingDate() != null && b.getBookingDate().equals(tomorrow))
                .collect(Collectors.toList());

        for (Booking booking : tomorrowBookings) {
            whatsappService.sendReminder(booking.getUser(), booking);
        }
        System.out.println("Sent " + tomorrowBookings.size() + " reminders.");
    }
}
