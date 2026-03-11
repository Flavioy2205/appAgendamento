package com.pilates.service;

import com.pilates.model.Booking;
import com.pilates.model.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class WhatsappService {

    @Value("${evolution.api.url:http://evolution_api:8080}")
    private String evolutionApiUrl;

    @Value("${evolution.api.key:pilates-evolution-api-key-123}")
    private String apiKey;

    @Value("${evolution.api.instance:pilates}")
    private String instanceName;

    private final RestTemplate restTemplate = new RestTemplate();

    public void sendMessage(String phone, String text) {
        if (phone == null || phone.trim().isEmpty()) {
            System.out.println("No phone number to send WhatsApp message");
            return;
        }
        
        String cleanPhone = phone.replaceAll("\\D", "");
        if (!cleanPhone.startsWith("55")) {
            cleanPhone = "55" + cleanPhone;
        }

        try {
            String url = evolutionApiUrl + "/message/sendText/" + instanceName;
            System.out.println("Attempting to send WhatsApp message to " + cleanPhone + " via " + url);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("apikey", apiKey);

            Map<String, Object> textMessage = new HashMap<>();
            textMessage.put("text", text);

            Map<String, Object> body = new HashMap<>();
            body.put("number", cleanPhone);
            body.put("options", Map.of("delay", 1200));
            body.put("textMessage", textMessage);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            System.out.println("Payload: " + body);
            
            restTemplate.postForEntity(url, request, String.class);
            System.out.println("WhatsApp message sent to " + cleanPhone);
        } catch (Exception e) {
            System.err.println("Failed to send WhatsApp message: " + e.getMessage());
        }
    }

    public void sendBookingConfirmation(User user, Booking booking, int successfulWeeks) {
        String dateStr = booking.getBookingDate() != null ? 
            booking.getBookingDate().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "hoje";
        String timeStr = booking.getTimeSlot().getStartTime().toString();

        String message = "Olá *" + user.getName() + "*! \n\n" +
            "Seu agendamento de Pilates foi *confirmado* com sucesso! ✅\n\n";
            
        if(successfulWeeks > 1) {
            message += "Agendado como fixo por *" + successfulWeeks + "* semana(s) a partir de *" + dateStr + "*.\n";
        } else {
            message += "📅 *" + dateStr + "*\n";
        }

        message += "⏰ *" + timeStr + "*\n\nTe esperamos no estúdio!";
        
        sendMessage(user.getPhone(), message);
    }

    public void sendReminder(User user, Booking booking) {
        String timeStr = booking.getTimeSlot().getStartTime().toString();

        String message = "Olá *" + user.getName() + "*! Passando para lembrar do seu Pilates de amanhã! ⏰\n\n" +
            "Sua aula está marcada para as *" + timeStr + "*.\n" +
            "Por favor, confirme sua presença. \n\n" +
            "Nos vemos lá! 😉";
        
        sendMessage(user.getPhone(), message);
    }
}
