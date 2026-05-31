package br.com.harmonia;

import org.springframework.boot.SpringApplication;

public class TestHarmoniaApplication {

	public static void main(String[] args) {
		SpringApplication.from(HarmoniaApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
