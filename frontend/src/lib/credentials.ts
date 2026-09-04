/** Gera e descarrega um ficheiro de texto simples com as credenciais de acesso — usado sempre
 * que uma conta é criada (cliente, agente ou administrador), como alternativa a copiar. */
export function downloadCredentialsFile(identifier: string, password: string) {
  const content =
    `Agência Funerária Espírito Santo\n` +
    `Credenciais de acesso\n\n` +
    `Utilizador: ${identifier}\n` +
    `Password temporária: ${password}\n\n` +
    `Esta password é temporária — ser-lhe-á pedido para a substituir no primeiro acesso.\n`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `credenciais-${identifier}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
