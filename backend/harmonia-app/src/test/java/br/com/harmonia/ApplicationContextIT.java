package br.com.harmonia;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

/**
 * Integration test: boots the full Spring context against a real PostgreSQL container.
 * Named *IT (not *Test) so it runs in the integration stage - the unit stage stays
 * framework- and Docker-free.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
class ApplicationContextIT {

	@Test
	void contextLoads() {
	}

}
