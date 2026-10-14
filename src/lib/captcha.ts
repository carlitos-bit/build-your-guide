// Configuração do CAPTCHA (Cloudflare Turnstile).
//
// Para habilitar a verificação anti-robô no formulário de acesso:
//   1. Crie um widget em https://dash.cloudflare.com/ (Turnstile) e copie o "Site Key".
//   2. Defina VITE_TURNSTILE_SITE_KEY nas variáveis do projeto (Lovable: Cloud > Secrets).
//   3. Ative a proteção de CAPTCHA no Supabase Auth (Auth > Settings > CAPTCHA)
//      usando a "Secret Key" do Turnstile.
//
// Sem a variável definida, o widget simplesmente não é renderizado e nada quebra.
export const turnstileSiteKey: string = import.meta.env["VITE_TURNSTILE_SITE_KEY"] ?? "";

export const captchaAtivo = turnstileSiteKey.length > 0;
