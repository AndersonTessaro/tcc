package br.com.harmonia.presentation.teacher;

import br.com.harmonia.application.teacher.TeacherFinanceUseCase;
import br.com.harmonia.application.teacher.TeacherFinanceUseCase.TeacherFinance;
import br.com.harmonia.application.teacher.TeacherMakeupsUseCase;
import br.com.harmonia.presentation.response.TeacherMakeupResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/teacher")
public class TeacherMoreController {
    private final TeacherFinanceUseCase finance;
    private final TeacherMakeupsUseCase makeups;

    public TeacherMoreController(TeacherFinanceUseCase finance, TeacherMakeupsUseCase makeups) {
        this.finance = finance;
        this.makeups = makeups;
    }

    @GetMapping("/finance")
    @PreAuthorize("hasAuthority('finance.read.own')")
    public TeacherFinance finance() {
        return finance.get();
    }

    @GetMapping("/makeups")
    @PreAuthorize("hasAuthority('lesson.read')")
    public List<TeacherMakeupResponse> makeups(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return makeups.list(from, to).stream().map(TeacherMakeupResponse::of).toList();
    }
}
