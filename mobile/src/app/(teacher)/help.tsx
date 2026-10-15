import { Text } from "react-native";
import { MoreScreen, moreStyles as styles } from "@/features/teacher/more/MoreScreen";
import { Card } from "@/ui/Card";

const questions = [
  ["Como registrar uma aula?", "Na Agenda, toque em Nova aula, selecione o aluno e preencha data, horário, conteúdo e tarefa."],
  ["Como registrar a presença?", "Abra a aula na Agenda ou na lista de aulas do aluno e marque presença, falta ou falta justificada. Pela RN09, aula passada sem frequência registrada conta como falta nos relatórios."],
  ["Como criar uma reposição?", "Na Agenda, use Repor em uma aula concluída ou cancelada. A nova aula fica vinculada à original e aparece em Mais → Reposições."],
  ["Como adicionar anexos?", "Abra a aula para editar e adicione PDF, imagem, áudio ou vídeo. Cada arquivo pode ter até 50 MB e a aula aceita até 10 anexos."],
  ["Onde consultar os relatórios?", "Na aba Relatórios, escolha frequência, prática em casa, desempenho de turmas ou evolução por aluno. Os relatórios agregados permitem consultar 30 ou 90 dias."],
];

export default function Help() {
  return (
    <MoreScreen title="Ajuda">
      {questions.map(([question, answer]) => (
        <Card key={question} style={styles.card}>
          <Text accessibilityRole="header" style={styles.heading}>{question}</Text>
          <Text style={styles.body}>{answer}</Text>
        </Card>
      ))}
      <Text style={styles.body}>Dúvidas? Fale com a secretaria da escola</Text>
    </MoreScreen>
  );
}
