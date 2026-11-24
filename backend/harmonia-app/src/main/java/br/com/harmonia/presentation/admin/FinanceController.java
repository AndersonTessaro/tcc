package br.com.harmonia.presentation.admin;

import br.com.harmonia.application.finance.FinanceUseCase;
import br.com.harmonia.infrastructure.persistence.finance.TransactionType;
import br.com.harmonia.presentation.response.TransactionResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/admin/finance")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('finance.manage')")
public class FinanceController {
    private final FinanceUseCase uc;

    public FinanceController(FinanceUseCase uc) {
        this.uc = uc;
    }

    public record NewTransaction(@NotNull TransactionType type, @NotNull @Positive BigDecimal amount,
                                 String description, String category, LocalDate date, UUID studentId, UUID schoolId) {}

    @GetMapping("/transactions")
    public List<TransactionResponse> list() {
        return uc.list().stream().map(TransactionResponse::of).toList();
    }

    @GetMapping("/balance")
    public Map<String, BigDecimal> balance() {
        return Map.of("balance", uc.balance());
    }

    @PostMapping("/transactions")
    public TransactionResponse create(@Valid @RequestBody NewTransaction r) {
        return TransactionResponse.of(uc.create(r.type(), r.amount(), r.description(), r.category(), r.date(), r.studentId(), r.schoolId()));
    }
}
