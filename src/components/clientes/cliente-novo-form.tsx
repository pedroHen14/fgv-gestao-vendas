"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Loader2,
  MapPin,
  Save,
  Tractor,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { UF_LIST, type TipoPessoa } from "@/lib/constants";
import { createClienteAction } from "@/app/(dashboard)/clientes/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function ClienteNovoForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  // Dados principais do cliente
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>("PJ");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [origemIndicacao, setOrigemIndicacao] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Endereço inicial (opcional)
  const [incluirEndereco, setIncluirEndereco] = useState(true);
  const [rotuloEndereco, setRotuloEndereco] = useState("Matriz");
  const [logradouro, setLogradouro] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("SP");
  const [cep, setCep] = useState("");

  // Comprador inicial (opcional)
  const [incluirComprador, setIncluirComprador] = useState(true);
  const [compradorNome, setCompradorNome] = useState("");
  const [compradorEmail, setCompradorEmail] = useState("");
  const [compradorEmailFin, setCompradorEmailFin] = useState("");
  const [compradorTelefone, setCompradorTelefone] = useState("");
  const [compradorDepto, setCompradorDepto] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const hasEndereco =
      incluirEndereco &&
      (logradouro.trim() !== "" || cidade.trim() !== "");
    const hasComprador = incluirComprador && compradorNome.trim() !== "";

    if (incluirEndereco && !hasEndereco && (bairro.trim() || cep.trim())) {
      setFormError("Para salvar o endereço, preencha pelo menos o logradouro e a cidade.");
      return;
    }

    startTransition(async () => {
      const result = await createClienteAction({
        cliente: {
          tipo_pessoa: tipoPessoa,
          razao_social: razaoSocial,
          cpf_cnpj: cpfCnpj || null,
          inscricao_estadual: inscricaoEstadual || null,
          data_nascimento: tipoPessoa === "PF" ? dataNascimento || null : null,
          origem_indicacao: origemIndicacao || null,
          observacoes: observacoes || null,
        },
        endereco: hasEndereco
          ? {
              tipo: "FATURAMENTO",
              rotulo: rotuloEndereco || "Matriz",
              logradouro,
              bairro: bairro || null,
              cidade,
              uf,
              cep: cep || null,
              principal: true,
            }
          : null,
        comprador: hasComprador
          ? {
              nome: compradorNome,
              email: compradorEmail || null,
              email_financeiro: compradorEmailFin || null,
              telefone: compradorTelefone || null,
              departamento: compradorDepto || null,
              ativo: true,
            }
          : null,
      });

      if (!result.success || !result.data) {
        setFormError(result.error ?? "Não foi possível salvar o cliente.");
        return;
      }

      toast.success("Cliente cadastrado com sucesso!");
      router.push(`/clientes/${result.data.id}`);
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/clientes">
            <ArrowLeft className="size-4" />
            Voltar para Clientes
          </Link>
        </Button>
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Cadastrar Novo Cliente
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Preencha os dados básicos abaixo. Depois você poderá adicionar quantas
          filiais e compradores precisar na ficha do cliente.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seção 1: Dados do Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. Dados do Cliente</CardTitle>
            <CardDescription>
              Escolha se é uma empresa (CNPJ) ou produtor rural / pessoa física (CPF).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setTipoPessoa("PJ")}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                  tipoPessoa === "PJ"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                  <Building2 className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Empresa (Pessoa Jurídica)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CNPJ e Inscrição Estadual
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTipoPessoa("PF")}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                  tipoPessoa === "PF"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                  <Tractor className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Produtor Rural / Pessoa Física
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CPF, Inscrição Estadual e Data de Nascimento
                  </p>
                </div>
              </button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="razao-social">
                {tipoPessoa === "PJ" ? "Razão Social / Nome da Empresa *" : "Nome Completo *"}
              </Label>
              <Input
                id="razao-social"
                placeholder={
                  tipoPessoa === "PJ"
                    ? "Ex.: Agropecuária Santa Maria Ltda"
                    : "Ex.: João Carlos da Silva"
                }
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cpf-cnpj">
                  {tipoPessoa === "PJ" ? "CNPJ" : "CPF"}
                </Label>
                <Input
                  id="cpf-cnpj"
                  placeholder={
                    tipoPessoa === "PJ"
                      ? "00.000.000/0000-00"
                      : "000.000.000-00"
                  }
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ie">Inscrição Estadual</Label>
                <Input
                  id="ie"
                  placeholder="Ex.: Isento ou número da IE"
                  value={inscricaoEstadual}
                  onChange={(e) => setInscricaoEstadual(e.target.value)}
                />
              </div>
            </div>

            {tipoPessoa === "PF" ? (
              <div className="max-w-xs space-y-1.5">
                <Label htmlFor="data-nascimento">
                  Data de Nascimento (usada no faturamento)
                </Label>
                <Input
                  id="data-nascimento"
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="origem">Origem / Indicação</Label>
              <Input
                id="origem"
                placeholder="Ex.: Agência indicada pela Syngenta, Feira Agrishow..."
                value={origemIndicacao}
                onChange={(e) => setOrigemIndicacao(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="observacoes">Observações Gerais</Label>
              <Textarea
                id="observacoes"
                placeholder="Anotações importantes sobre este cliente..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Seção 2: Endereço Principal */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="size-4 text-primary" />
                2. Endereço Principal (Faturamento)
              </CardTitle>
              <CardDescription>
                Será preenchido automaticamente quando você abrir um pedido para este
                cliente.
              </CardDescription>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
              <Checkbox
                checked={incluirEndereco}
                onChange={(e) => setIncluirEndereco(e.target.checked)}
              />
              Preencher agora
            </label>
          </CardHeader>

          {incluirEndereco ? (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="end-rotulo">Identificação</Label>
                  <Input
                    id="end-rotulo"
                    placeholder="Ex.: Matriz"
                    value={rotuloEndereco}
                    onChange={(e) => setRotuloEndereco(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="end-logradouro">Endereço (Rua, nº, complemento)</Label>
                  <Input
                    id="end-logradouro"
                    placeholder="Ex.: Av. Paulista, 1000 - Sala 12"
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="end-bairro">Bairro</Label>
                  <Input
                    id="end-bairro"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end-cidade">Cidade</Label>
                  <Input
                    id="end-cidade"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end-uf">Estado (UF)</Label>
                  <Select
                    id="end-uf"
                    value={uf}
                    onChange={(e) => setUf(e.target.value)}
                  >
                    {UF_LIST.map((sigla) => (
                      <option key={sigla} value={sigla}>
                        {sigla}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end-cep">CEP</Label>
                  <Input
                    id="end-cep"
                    placeholder="00000-000"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          ) : null}
        </Card>

        {/* Seção 3: Primeiro Comprador */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="size-4 text-primary" />
                3. Comprador / Contato Principal
              </CardTitle>
              <CardDescription>
                Você pode cadastrar mais compradores depois na ficha do cliente.
              </CardDescription>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
              <Checkbox
                checked={incluirComprador}
                onChange={(e) => setIncluirComprador(e.target.checked)}
              />
              Preencher agora
            </label>
          </CardHeader>

          {incluirComprador ? (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="comp-nome">Nome do Comprador</Label>
                  <Input
                    id="comp-nome"
                    placeholder="Ex.: Maria Fernanda"
                    value={compradorNome}
                    onChange={(e) => setCompradorNome(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="comp-depto">Departamento</Label>
                  <Input
                    id="comp-depto"
                    placeholder="Ex.: Marketing, Eventos, Compras"
                    value={compradorDepto}
                    onChange={(e) => setCompradorDepto(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="comp-email">E-mail do Comprador</Label>
                  <Input
                    id="comp-email"
                    type="email"
                    placeholder="comprador@empresa.com.br"
                    value={compradorEmail}
                    onChange={(e) => setCompradorEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="comp-email-fin">E-mail Financeiro</Label>
                  <Input
                    id="comp-email-fin"
                    type="email"
                    placeholder="financeiro@empresa.com.br"
                    value={compradorEmailFin}
                    onChange={(e) => setCompradorEmailFin(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="comp-fone">Telefone / WhatsApp</Label>
                  <Input
                    id="comp-fone"
                    placeholder="(11) 99999-9999"
                    value={compradorTelefone}
                    onChange={(e) => setCompradorTelefone(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          ) : null}
        </Card>

        {formError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {formError}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button asChild type="button" variant="outline" size="lg">
            <Link href="/clientes">Cancelar</Link>
          </Button>
          <Button type="submit" size="lg" disabled={isPending} className="font-semibold">
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Salvar Cliente
          </Button>
        </div>
      </form>
    </div>
  );
}
