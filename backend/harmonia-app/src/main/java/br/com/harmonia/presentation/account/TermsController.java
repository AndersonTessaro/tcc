package br.com.harmonia.presentation.account;

import br.com.harmonia.application.account.TermsCatalog;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TermsController {
    private final TermsCatalog terms;

    public TermsController(TermsCatalog terms) {
        this.terms = terms;
    }

    @GetMapping("/terms")
    public TermsCatalog.Terms current() {
        return terms.current();
    }
}
