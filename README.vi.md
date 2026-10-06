# Website học từ vựng và ngữ pháp HSK

[中文](README.md) | **Tiếng Việt**

Website tự học HSK dành cho người Việt, gồm hai phần: từ vựng và ngữ pháp. Giao diện tiếng Việt, phần giải nghĩa có cả tiếng Việt và tiếng Anh.

## Chức năng

### Từ vựng (HSK 1–6)

- Gồm 4998 từ của HSK 1–6 theo đề cương HSK 2.0, toàn bộ dùng chữ giản thể.
- Mỗi từ có: pinyin, âm Hán Việt, nghĩa tiếng Việt, nghĩa tiếng Anh và một câu ví dụ.
- Câu ví dụ dùng từ vựng đúng trình độ của cấp đó; toàn bộ dữ liệu cố gắng bao quát nhiều cấu trúc ngữ pháp khác nhau và có ghi chú điểm ngữ pháp được dùng.
- Mặc định chỉ hiện chữ Hán; bấm vào từ mới hiện nghĩa và câu ví dụ; pinyin và bản dịch của câu ví dụ được ẩn thêm một lớp, bấm lần nữa mới hiện, để tự đọc thử trước.
- Tìm kiếm theo chữ Hán, pinyin, âm Hán Việt hoặc nghĩa (không phân biệt dấu thanh pinyin và dấu tiếng Việt).
- Có nút đọc từ và câu ví dụ (dùng giọng đọc có sẵn của trình duyệt).

### Ngữ pháp

- Nội dung theo giáo trình Chuẩn HSK (《HSK 标准教程》), sắp xếp các điểm ngữ pháp (注释) theo từng bài.
- Mỗi điểm ngữ pháp có giải thích tiếng Việt (theo sách) và tiếng Anh, chia theo từng cách dùng.
- Câu ví dụ lấy từ sách, mặc định chỉ hiện chữ Hán, phần ngữ pháp được tô màu trong câu; bấm vào câu mới hiện pinyin, bản dịch tiếng Việt và tiếng Anh, hoặc bấm một nút để hiện tất cả.
- Có cả phần “So sánh” (比一比) trong sách, phân biệt các từ gần nghĩa như 刚—刚才, 差不多—几乎, 究竟—到底.
- Tiêu đề mỗi điểm ngữ pháp có kèm pinyin.

### Theo dõi việc học

- Mỗi từ và mỗi điểm ngữ pháp có thể đánh dấu 3 trạng thái: chưa thuộc / hơi nhớ / đã thuộc.
- Tiêu đề mỗi cấp hoặc mỗi bài hiện số lượng theo từng trạng thái; bấm vào để chỉ xem trạng thái đó.
- Trạng thái học được lưu trên máy chủ theo tài khoản (Upstash Redis) và tự đồng bộ giữa các thiết bị; trình duyệt giữ một bản sao, các thay đổi khi mất mạng sẽ tự gửi lại khi có mạng.

### Khác

- Đầu trang có 2 tab “Từ vựng / Ngữ pháp”; khi cuộn xuống, thanh tab luôn dính ở đầu màn hình.
- Chỉ có một tài khoản, không có đăng ký; chưa đăng nhập thì không đọc được dữ liệu.
- Dùng được trên điện thoại và máy tính, có chế độ sáng và tối.

## Công nghệ

- Giao diện: React 19 + Vite
- Triển khai: Vercel (Serverless Functions + Routing Middleware)
- Lưu trữ: Upstash Redis (gọi qua REST API)
- Xử lý dữ liệu: Node.js, Python; pinyin câu ví dụ sinh bằng [pinyin-pro](https://github.com/zh-lx/pinyin-pro) và đối chiếu với CC-CEDICT

## Cấu trúc thư mục

```
data-src/                    Dữ liệu gốc và script xử lý
  content/hsk{cấp}*.txt      Nội dung từ vựng (mỗi dòng một từ)
  grammar/hsk{cấp}/NN.json   Nội dung ngữ pháp (mỗi bài một file)
  levels_raw.json            Danh sách từ theo cấp (từ mock.tangce.cn)
  tags.json                  Nhãn ngữ pháp của câu ví dụ
  validate.py                Kiểm tra định dạng nội dung từ vựng
  grammar_pinyin.txt         Pinyin câu ví dụ ngữ pháp (sinh khi build, để rà soát)
  pinyin_report.txt          Báo cáo pinyin của từ khác với trong câu (sinh khi build)
web/                         Website
  src/                       Giao diện React
  api/                       Vercel Serverless Functions (đăng nhập, phiên, trạng thái học)
  middleware.js              Chặn /data/* khi chưa đăng nhập
  scripts/build-data.mjs     Chuyển data-src thành public/data/*.json
  public/data/               Dữ liệu sau khi build
```

## Định dạng dữ liệu

### Từ vựng

`data-src/content/hsk{cấp}*.txt`, mỗi dòng 9 cột (thêm cột 10 nếu cần), ngăn cách bằng `|`:

```
词|pinyin|âm Hán Việt|nghĩa VI|nghĩa EN|câu ví dụ|dịch câu VI|dịch câu EN|nhãn ngữ pháp[|pinyin câu]
天气|tiānqì|thiên khí|thời tiết|weather|明天天气怎么样？|Thời tiết ngày mai thế nào?|What will the weather be like tomorrow?|特指问句
```

Cột 10 dùng để tự ghi pinyin cho câu ví dụ (các âm tiết cách nhau bởi dấu cách, mỗi chữ Hán một âm tiết); thường không cần điền.

### Ngữ pháp

`data-src/grammar/hsk{cấp}/NN.json`, mỗi bài một file:

```json
{
  "n": 4,
  "zh": "不要太着急赚钱",
  "vi": "Đừng quá nóng vội kiếm tiền",
  "en": "Don't be in too much of a hurry to make money",
  "points": [
    {
      "title": "原来",
      "uses": [
        {
          "vi": "Giải thích tiếng Việt",
          "en": "Giải thích tiếng Anh",
          "ex": [
            {
              "zh": "她【原来】是汉语老师，现在已经成了一名律师。",
              "vi": "Cô ấy vốn là giáo viên tiếng Trung, bây giờ đã trở thành luật sư.",
              "en": "She used to be a Chinese teacher; now she's become a lawyer."
            }
          ]
        }
      ],
      "cmp": { "title": "原来—本来", "uses": [] }
    }
  ]
}
```

- `【】` đánh dấu phần ngữ pháp cần tô màu trong câu ví dụ.
- `\n` tách các dòng hội thoại (số dòng của bản dịch tiếng Việt, tiếng Anh phải bằng số dòng tiếng Trung).
- `字{pinyin}` ghi rõ cách đọc của chữ đa âm, ví dụ `得{děi}`, `地{de}`, `倒{dào}`.
- Điểm ngữ pháp có thể thêm trường `py` để tự ghi pinyin cho tiêu đề.
- `cmp` là phần “So sánh” (比一比), không bắt buộc.

Sửa nội dung xong thì chạy `npm run data` để sinh lại dữ liệu, rồi xem `data-src/grammar_pinyin.txt` để rà các chữ đa âm.

## Chạy trên máy

Cần Node.js 20.19 hoặc 22.12 trở lên (yêu cầu của Vite 8).

```bash
cd web
npm install
cp .env.example .env.local   # điền tài khoản và khoá phiên
npm run dev                  # sinh dữ liệu rồi chạy Vite
```

`npm run dev` giả lập `api/*` và `middleware.js` của Vercel trên máy, nên đăng nhập hoạt động giống hệt bản đã deploy.

### Biến môi trường

| Biến | Ý nghĩa |
|---|---|
| `AUTH_USERNAME` | Tên đăng nhập |
| `AUTH_PASSWORD` | Mật khẩu |
| `SESSION_SECRET` | Khoá ký phiên (chuỗi ngẫu nhiên đủ dài); đổi giá trị này sẽ đăng xuất mọi phiên đang mở |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Địa chỉ REST và token của Upstash Redis (cũng nhận `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) |

Nếu chưa cấu hình Redis, website vẫn dùng được nhưng trạng thái học chỉ lưu trên trình duyệt đang dùng.

Tạo khoá ngẫu nhiên:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Triển khai

Import repo này vào Vercel, **đặt Root Directory là `web`**, điền các biến môi trường ở trên trong phần cài đặt dự án, rồi kết nối một cơ sở dữ liệu Upstash Redis trong mục Storage.

## Nguồn dữ liệu

- Danh sách từ: đề cương từ vựng HSK 2.0 (mock.tangce.cn).
- Đối chiếu pinyin: [CC-CEDICT](https://cc-cedict.org/) (CC BY-SA 4.0).
- Tham khảo âm Hán Việt: cơ sở dữ liệu Unicode Unihan.
- Ngữ pháp: giáo trình Chuẩn HSK (《HSK 标准教程》, bản tiếng Việt). Bản quyền phần giải thích ngữ pháp và câu ví dụ thuộc về nhà xuất bản; dự án chỉ dùng cho mục đích học tập cá nhân. Phần giải thích tiếng Anh và bản dịch tiếng Việt, tiếng Anh của câu ví dụ do dự án tự soạn.
