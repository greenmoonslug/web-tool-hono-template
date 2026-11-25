[開発環境: projects/my-tool/]             
├── index.html                           
├── public/                              # 静的配信アセット (ビルド時に dist/ 直下へコピー)
│   ├── manifest.webmanifest             #   ├ モバイルWebアプリ登録用マニフェスト
│   ├── sw.js                            #   ├ PWAインストール用Service Worker
│   ├── icon.svg                         #   └ アプリアイコン各種 (SVG / PNG)
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
├── src/                                 
│   ├── main.ts                          
│   ├── +page.svelte                       
│   └── lib/api.ts                       
├── api/                                 
│   ├── get-items.ts                     
│   ├── add-item.ts                      
│   └── delete-item.ts                   
├── _db/                                 
│   ├── schema.ts                        
│   └── index.ts                         
├── data/                # (.gitignore)  
│   ├── _db.sqlite
│   ├── _uploads/
│   └── public/
├── dist/                # (.gitignore)
├── vite.config.ts
└── package.json

[本番サーバー: www/tools/my-tool/]
├── index.html               # [スクリプト領域] ビルド済HTML
├── manifest.webmanifest     # [スクリプト領域] Webアプリマニフェスト
├── sw.js                    # [スクリプト領域] Service Worker
├── icon.svg / icon-*.png    # [スクリプト領域] アプリアイコン群
├── assets/                  # [スクリプト領域] ビルド済JS/CSS
├── api/                     # [スクリプト領域] 役割別APIファイル群
│   ├── get-items.ts
│   ├── add-item.ts
│   └── delete-item.ts
├── _db/                     # [スクリプト領域] DB定義
│   ├── schema.ts
│   └── index.ts
└── data/                    # [データ領域] 更新対象外（保護）
     ├── _db.sqlite          #   ├ 非公開(403): バックエンド(SQLite)が参照
     ├── _uploads/           #   ├ 非公開(403): バックエンド経由で配信
     └── public/             #   └ 公開: フロントエンドが直接参照
