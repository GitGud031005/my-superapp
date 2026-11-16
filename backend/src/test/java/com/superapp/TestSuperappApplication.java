package com.superapp;

import org.springframework.boot.SpringApplication;

public class TestSuperappApplication {

	public static void main(String[] args) {
		SpringApplication.from(SuperappApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
