package br.com.harmonia.application.security.port;

import br.com.harmonia.infrastructure.persistence.security.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findByUsernameOrEmail(String username, String email);

    @Query("select u from User u join u.roles r where r.name = 'MANAGER' and u.schoolId is not null order by lower(coalesce(u.displayName, u.username))")
    List<User> findSchoolManagers();
}
