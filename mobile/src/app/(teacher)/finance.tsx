import { Text } from "react-native";
import { teacherService } from "@/features/teacher/teacherService";
import { MoreScreen, moreStyles as styles } from "@/features/teacher/more/MoreScreen";
import { useResource } from "@/hooks/use-resource";
import { Card } from "@/ui/Card";
import { ScreenState } from "@/ui/ScreenState";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function Finance() {
  const finance = useResource(teacherService.finance);
  return (
    <MoreScreen title="Financeiro" resource={finance}>
      {finance.data ? <>
        <Card style={styles.card}>
          <Text style={styles.caption}>Total mensal</Text>
          <Text style={styles.amount}>{currency.format(finance.data.monthlyTotal)}</Text>
          <Text style={styles.body}>{finance.data.withoutFee} {finance.data.withoutFee === 1 ? "aluno sem mensalidade definida" : "alunos sem mensalidade definida"}</Text>
          <Text style={styles.caption}>Valores definidos pela secretaria</Text>
        </Card>
        {finance.data.items.map((item) => (
          <Card key={item.enrollmentId} style={styles.card}>
            <Text style={styles.heading}>{item.studentName}</Text>
            <Text style={styles.caption}>{item.classLabel}</Text>
            <Text style={styles.body}>{item.monthlyFee == null ? "Não definida" : currency.format(item.monthlyFee)}</Text>
          </Card>
        ))}
        {!finance.data.items.length ? <ScreenState title="Nenhuma matrícula ativa" /> : null}
      </> : null}
    </MoreScreen>
  );
}
