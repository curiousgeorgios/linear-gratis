<div dir="rtl">

# الاستضافة الذاتية باستخدام Docker

يعمل linear.gratis كحاوية Node واحدة مع حزمة Supabase صغيرة (Postgres وGoTrue وPostgREST وStorage). ملف `docker-compose.yml` يربط كل شيء خلف بوابة [Caddy](https://caddyserver.com/) واحدة، فيشترك التطبيق وواجهة Supabase في أصل واحد ونطاق واحد (وشهادة HTTPS تلقائية عند استخدام نطاق حقيقي).

النسخة الإنجليزية الكاملة: [self-hosting.md](self-hosting.md)

## البدء السريع (محلياً)

المتطلبات: Docker مع إضافة Compose، وNode 20 أو أحدث.

```bash
git clone https://github.com/curiousgeorgios/linear-gratis.git
cd linear-gratis

node docker/generate-env.mjs --url http://localhost:3000   # ينشئ ملف .env بأسرار جديدة
docker compose up -d --build
```

افتح <http://localhost:3000> وأنشئ حساباً من صفحة **/login**، ثم الصق رمز Linear API في **الملف الشخصي**. تُطبَّق ترحيلات قاعدة البيانات تلقائياً عند أول تشغيل عبر خدمة `migrate`.

بلا Node على جهازك؟ ولّد الملف من الصورة نفسها:

```bash
docker run --rm -v "$PWD:/out" <image> gen-env --out /out/.env --url http://localhost:3000
```

## النشر في بيئة الإنتاج

1. وجّه سجل DNS إلى خادمك وافتح المنفذين 80 و443.
2. ولّد البيئة لعنوانك العام:

   ```bash
   node docker/generate-env.mjs --url https://feedback.example.com
   ```

   يصبح `SITE_ADDRESS` اسم النطاق مجرّداً، فيحصل Caddy على شهادة Let's Encrypt ويجددها تلقائياً.
3. استخدم الصورة الجاهزة بدل البناء محلياً: اضبط في `.env` القيمة `LINEAR_GRATIS_IMAGE=<مستخدمك-في-dockerhub>/linear-gratis:latest` ثم:

   ```bash
   docker compose pull app
   docker compose up -d --no-build
   ```

4. (اختياري ويُنصح به) اضبط البريد: عبّئ `SMTP_*` وغيّر `AUTH_AUTOCONFIRM=false`، وأضف `magic_link` إلى `AUTH_METHODS` إن أردت الدخول بلا كلمة مرور.

خذ نسخاً احتياطية من وحدتي التخزين `db-data` و`storage-data` وأبقِ ملف `.env` سرياً. تغيير `ENCRYPTION_KEY` يجعل رموز Linear المخزّنة غير قابلة للقراءة.

## اللغة العربية و RTL

الواجهة تدعم العربية بالكامل مع اتجاه من اليمين إلى اليسار. اضبط `DEFAULT_LOCALE=ar` في `.env` لتكون العربية اللغة الافتراضية، ويستطيع كل زائر التبديل من زر اللغة في الترويسة. في غياب الاختيار تُستخدم لغة المتصفح تلقائياً.

## ربط Claude Code (MCP)

من **الملف الشخصي ← وصول MCP لـ Claude Code** أنشئ رمزاً ثم نفّذ:

```bash
claude mcp add --transport http linear-gratis https://feedback.example.com/api/mcp \
  --header "Authorization: Bearer lgk_your_token"
```

يعمل بالطريقة نفسها على النسخة المستضافة ذاتياً. التفاصيل في [mcp.md](mcp.md).

## نشر الصورة على Docker Hub

يبني سير العمل `.github/workflows/docker-publish.yml` صورة متعددة المعماريات (`amd64` و`arm64`) ويدفعها إلى Docker Hub وGHCR:

1. أنشئ رمز وصول (Access Token) في Docker Hub بصلاحية القراءة والكتابة.
2. أضف في مستودع GitHub السرّين `DOCKERHUB_USERNAME` و`DOCKERHUB_TOKEN` (ويمكن إضافة المتغير `DOCKERHUB_REPOSITORY`).
3. ادفع إلى `main` للحصول على وسم `edge`، أو أنشئ إصداراً (`git tag v1.0.0 && git push --tags`) للحصول على `1.0.0` و`1.0` و`1` و`latest`.

## الترقية

```bash
git pull
docker compose pull app      # أو: docker compose build app
docker compose up -d
```

</div>
