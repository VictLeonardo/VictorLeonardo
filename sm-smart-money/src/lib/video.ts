/**
 * Traduz o endereco de um video para a forma que toca dentro da plataforma.
 *
 * Quem publica cola o endereco da barra do navegador -- e esse endereco quase
 * nunca e' o que um iframe aceita. O do YouTube e' `/watch?v=ID`, que o proprio
 * YouTube recusa enquadrar; a forma que ele publica para embutir e' `/embed/ID`.
 * O do Vimeo e' `vimeo.com/ID`, e o player dele mora em `player.vimeo.com`.
 *
 * Converter aqui, na hora de exibir, e' melhor do que converter ao salvar: o
 * endereco que a pessoa escreveu continua guardado como ela escreveu, e se o
 * formato de embed mudar um dia, muda-se esta funcao em vez de uma coluna.
 */

export type VideoResolvido =
  | { modo: 'embed'; url: string }
  | { modo: 'arquivo'; url: string };

/** O identificador do video, quando o endereco for de um servico conhecido. */
function idDoYoutube(u: URL): string | null {
  const host = u.hostname.replace(/^www\./, '');

  if (host === 'youtu.be') return u.pathname.slice(1) || null;
  if (host !== 'youtube.com' && host !== 'm.youtube.com' && host !== 'music.youtube.com') return null;

  if (u.pathname === '/watch') return u.searchParams.get('v');
  // /embed/ID, /shorts/ID, /live/ID -- todos trazem o id no segundo segmento.
  const m = u.pathname.match(/^\/(embed|shorts|live|v)\/([^/?#]+)/);
  return m ? m[2] : null;
}

function idDoVimeo(u: URL): string | null {
  const host = u.hostname.replace(/^www\./, '');
  if (host === 'player.vimeo.com') {
    const m = u.pathname.match(/^\/video\/(\d+)/);
    return m ? m[1] : null;
  }
  if (host !== 'vimeo.com') return null;
  const m = u.pathname.match(/^\/(\d+)/);
  return m ? m[1] : null;
}

export function resolverVideo(endereco: string): VideoResolvido {
  const limpo = endereco.trim();

  let u: URL;
  try {
    u = new URL(limpo);
  } catch {
    // Nao e' endereco absoluto: devolve como esta' e deixa o <video> tentar.
    return { modo: 'arquivo', url: limpo };
  }

  const youtube = idDoYoutube(u);
  if (youtube) return { modo: 'embed', url: `https://www.youtube.com/embed/${youtube}` };

  const vimeo = idDoVimeo(u);
  if (vimeo) return { modo: 'embed', url: `https://player.vimeo.com/video/${vimeo}` };

  // Bunny e outros ja' entregam o endereco de embed pronto; nao ha' o que
  // traduzir, so' reconhecer.
  if (/\/embed\//.test(u.pathname) && /b-cdn\.net|mediadelivery\.net/.test(u.hostname)) {
    return { modo: 'embed', url: limpo };
  }

  return { modo: 'arquivo', url: limpo };
}
