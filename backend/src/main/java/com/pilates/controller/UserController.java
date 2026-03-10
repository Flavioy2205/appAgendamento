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
        int weeklyLimit = payload.containsKey("weeklyLimit") ? Integer.parseInt(payload.get("weeklyLimit").toString()) : 2;
        int totalClasses = payload.containsKey("totalClasses") ? Integer.parseInt(payload.get("totalClasses").toString()) : 0;
        
        if (userRepository.findByCpf(cpf).isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "CPF já cadastrado"));
        }
        
        User user = new User(cpf, name, "ALUNO", weeklyLimit, totalClasses);
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
