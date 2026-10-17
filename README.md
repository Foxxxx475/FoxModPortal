# Fox Mod Portal v1

Privacy-first static mod portal for Tactical Assault VR.

## v1 includes
- Home page
- Searchable mod catalog
- Category filtering
- Featured mods
- Creator hub
- .tamod documentation
- Privacy page
- No-account local submission packet generator

## Hosting
This is plain static HTML/CSS/JS. It can be hosted on GitHub Pages, Vercel, Cloudflare Pages, or any static host.

## Important limitation
The v1 catalog and submission workflow do not claim that Tactical Assault VR currently accepts external mod content. Runtime integration is a separate technical project.

## Privacy
The submission form does not upload its fields. It only creates JSON/Markdown in the visitor's browser.

## License
The portal's code is released under the MIT License (see `LICENSE`). Individual mods listed in the catalog are licensed by their creators.

## Owner tools
`owner.html` (not linked from the nav) builds a new `mods.json` locally: add verified creators, mark mods "Approved by Fox", import submission packets, delete listings. Upload the downloaded `mods.json` to the repo root to publish. It isn't password protected; changes only go live when you commit the file.

## Disclaimer
Mods are not scanned or analyzed before posting (at the moment). I don't take credit for any mod posted here.
