package com.pilates.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String cpf;

    @Column(nullable = false)
    private String name;

    @Column
    private String phone;

    @Column(nullable = false)
    private String role; // "ADMIN" or "ALUNO"

    @Column(nullable = false)
    private int weeklyLimit = 2;

    @Column(nullable = false)
    private int totalClasses = 0;

    @Column(nullable = false)
    private boolean active = true;

    public User(String cpf, String name, String phone, String role, int weeklyLimit, int totalClasses) {
        this.cpf = cpf;
        this.name = name;
        this.phone = phone;
        this.role = role;
        this.weeklyLimit = weeklyLimit;
        this.totalClasses = totalClasses;
        this.active = true;
    }

    public User(String cpf, String name, String phone, String role, int weeklyLimit) {
        this.cpf = cpf;
        this.name = name;
        this.phone = phone;
        this.role = role;
        this.weeklyLimit = weeklyLimit;
        this.totalClasses = 0;
        this.active = true;
    }
}
