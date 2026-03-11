package com.pilates.controller;

import com.pilates.model.User;
import com.pilates.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class UserController {
    
    @Autowired
    private UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload) {
        String cpf = payload.get("cpf");
        Optional<User> user = userRepository.findByCpf(cpf);
        if (user.isPresent()) {
            return ResponseEntity.ok(user.get());
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "CPF não encontrado"));
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody Map<String, Object> payload) {
        String cpf = payload.get("cpf").toString();
        String name = payload.get("name").toString();
        String phone = payload.containsKey("phone") && payload.get("phone") != null ? payload.get("phone").toString() : null;
        int weeklyLimit = payload.containsKey("weeklyLimit") ? Integer.parseInt(payload.get("weeklyLimit").toString()) : 2;
        int totalClasses = payload.containsKey("totalClasses") ? Integer.parseInt(payload.get("totalClasses").toString()) : 0;
        
        if (userRepository.findByCpf(cpf).isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "CPF já cadastrado"));
        }
        
        User user = new User(cpf, name, phone, "ALUNO", weeklyLimit, totalClasses);
        userRepository.save(user);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/users")
    public ResponseEntity<Iterable<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @PutMapping("/users/{id}/deactivate")
    public ResponseEntity<?> deactivateUser(@PathVariable Long id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setActive(false);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Aluno inativado com sucesso."));
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Aluno não encontrado."));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            
            if (payload.containsKey("name")) user.setName(payload.get("name").toString());
            if (payload.containsKey("cpf")) {
                String newCpf = payload.get("cpf").toString();
                if (!newCpf.equals(user.getCpf()) && userRepository.findByCpf(newCpf).isPresent()) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Este CPF já está sendo usado por outro aluno."));
                }
                user.setCpf(newCpf);
            }
            if (payload.containsKey("phone")) user.setPhone(payload.get("phone") != null ? payload.get("phone").toString() : null);
            if (payload.containsKey("weeklyLimit")) user.setWeeklyLimit(Integer.parseInt(payload.get("weeklyLimit").toString()));
            if (payload.containsKey("totalClasses")) user.setTotalClasses(Integer.parseInt(payload.get("totalClasses").toString()));
            
            userRepository.save(user);
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Aluno não encontrado."));
    }

    @PutMapping("/users/{id}/reactivate")
    public ResponseEntity<?> reactivateUser(@PathVariable Long id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setActive(true);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Aluno reativado com sucesso."));
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Aluno não encontrado."));
    }
}
