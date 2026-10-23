# Site Dino Digital — Ariete Design (Parallax Code 2.5)

Site imersivo: o scroll controla um vídeo de 10s (o pino verde cai e acende a rua de negócios).

## 📦 Como usar seu site Ariete Design

1. A página principal é o `index.html` (com `styles.css`, `script.js` e a pasta `assets/`). Suba **tudo junto**.
2. Se o vídeo travar no scroll (leve + all-keyframe + faststart):
   `ffmpeg -i original.mp4 -vf "scale=1600:-2" -g 1 -keyint_min 1 -sc_threshold 0 -c:v libx264 -crf 23 -pix_fmt yuv420p -an -movflags +faststart video.mp4`
   (celular 9:16: `scale=900:-2`)
3. Atualizou CSS/JS e "continua igual"? É cache: aumente o `?v=` nos links do `index.html` e suba o index de novo.
4. Cores ficam em `:root { }` no `styles.css`.
5. **Hostinger:** `public_html` → arraste todos os arquivos e pastas. Depois do upload, confira se o tamanho dos `.mp4` no servidor é igual ao do seu computador (`hero-169.mp4` = 6.523.220 bytes · `hero-916.mp4` = 5.870.730 bytes). Suba por Gerenciador de Arquivos ou FTP.
6. Quer mais seções ou efeitos? Use `/ariete-design` de novo.

> O servidor precisa aceitar *range requests* (Hostinger, cPanel e Netlify aceitam). Não teste o scroll do vídeo com `python -m http.server`.

## O que ainda trocar (procure `TROCAR`)

- Domínio (`dinodigital.com.br` é exemplo): `<head>` do index, `robots.txt`, `sitemap.xml`
- Horário de atendimento e CNPJ no rodapé
- Itens de "Não é pra você se" (seção 05)
- Política de privacidade: revisar

## Arquivos

```
index.html · styles.css · script.js · 404.html · politica-de-privacidade.html
assets/video/hero-169.mp4 (desktop) · hero-916.mp4 (celular) · posters
assets/img/ logo, favicon, foto
og-image.jpg · site.webmanifest · robots.txt · sitemap.xml
```
