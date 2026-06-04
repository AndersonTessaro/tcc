package br.com.harmonia.application.finance.port;

import br.com.harmonia.infrastructure.persistence.finance.FinancialTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface FinancialTransactionRepository extends JpaRepository<FinancialTransaction, UUID> {
}
