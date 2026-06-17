import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface Props {
  label: string;
}

const WorkspacePlaceholder = ({ label }: Props) => (
  <div className="p-6 lg:p-8 max-w-3xl">
    <Card>
      <CardContent className="p-10 text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-muted mx-auto flex items-center justify-center">
          <Construction className="w-6 h-6 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold">{label} — em construção</h2>
        <p className="text-sm text-muted-foreground">
          Sua agência liberou esse módulo, mas a tela ainda está sendo construída.
          Em breve você acessa por aqui.
        </p>
      </CardContent>
    </Card>
  </div>
);

export default WorkspacePlaceholder;
