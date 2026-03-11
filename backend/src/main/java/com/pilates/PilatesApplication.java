package com.pilates;

import com.pilates.model.TimeSlot;
import com.pilates.model.User;
import com.pilates.repository.TimeSlotRepository;
import com.pilates.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import java.time.LocalTime;

import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PilatesApplication {

    public static void main(String[] args) {
        SpringApplication.run(PilatesApplication.class, args);
    }

    @Bean
    public CommandLineRunner loadData(TimeSlotRepository timeSlotRepository, UserRepository userRepository) {
        return (args) -> {
            if (userRepository.count() == 0) {
                userRepository.save(new User("12345678910", "Administrador", null, "ADMIN", 999));
            }

            // Check if db is empty before populating
            if (timeSlotRepository.count() == 0) {
                // Populate morning to evening routines for Monday and Wednesday
                java.time.DayOfWeek[] days = { java.time.DayOfWeek.MONDAY, java.time.DayOfWeek.WEDNESDAY };

                for (java.time.DayOfWeek day : days) {
                    LocalTime start = LocalTime.of(7, 0); // 7 AM
                    LocalTime end = LocalTime.of(20, 0); // 8 PM

                    while (start.isBefore(end)) {
                        TimeSlot slot = new TimeSlot(day, start);
                        timeSlotRepository.save(slot);
                        start = start.plusHours(1); // 1-hour classes
                    }
                }
            }
        };
    }
}
