
import pandas as pd
import glob
import os

# --- 1. データ集約 ---
path = "/Users/kaya.matsumoto/projects/family-budget/datalake/ご利用明細*.csv"
all_files = glob.glob(path)
df_list = []

for f in all_files:
    try:
        # カード番号（使用者）をファイルから読み込む
        with open(f, 'r', encoding='shift-jis') as file:
            first_line = file.readline()
            user_id = first_line.strip().split(',')[-1]

        # 明細データを読み込む
        df = pd.read_csv(f, encoding="shift-jis", header=None, skiprows=4)
        df['使用者'] = user_id  # 使用者IDを列として追加
        df_list.append(df)
    except Exception as e:
        print(f"Error reading {f}: {e}")

# 全てのデータフレームを結合
full_df = pd.concat(df_list, ignore_index=True)

# カラム名を付ける
full_df.columns = [
    "利用日", "利用店名", "利用金額", "支払方法", "請求額",
    "支払区分", "備考", "請求額（外貨）", "現地通貨額", "通貨", "換算レート", "使用者"
]

# --- 2. データ整形 ---
# 日付形式が正しい行のみを抽出
full_df = full_df[full_df["利用日"].str.contains(r"^\d{4}/\d{2}/\d{2}", na=False)]

# データ型の変換
full_df["利用日"] = pd.to_datetime(full_df["利用日"])
full_df["利用金額"] = pd.to_numeric(full_df["利用金額"].str.replace(",", ""), errors='coerce')
full_df["月"] = full_df["利用日"].dt.to_period("M").astype(str)

# --- 3. データ分析 ---
# 月次推移
monthly_trend = full_df.groupby("月")["利用金額"].sum().reset_index()
monthly_trend = monthly_trend.sort_values("月")

# 使用者別の月次支出
user_monthly_spending = full_df.groupby(["使用者", "月"])["利用金額"].sum().unstack(fill_value=0)

# 上位の支出先
top_merchants = full_df.groupby("利用店名")["利用金額"].sum().sort_values(ascending=False).head(20).reset_index()

# --- 4. HTMLレポート生成 ---
html_content = f"""
<html>
<head>
    <title>家計支出レポート</title>
    <style>
        body {{ font-family: sans-serif; margin: 2em; }}
        h1, h2 {{ color: #333; }}
        table {{ border-collapse: collapse; width: 80%; margin-bottom: 2em; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #f2f2f2; }}
        tr:nth-child(even) {{ background-color: #f9f9f9; }}
        .total {{ font-weight: bold; }}
    </style>
</head>
<body>
    <h1>家計支出レポート</h1>

    <h2>サマリー</h2>
    <p><strong>総支出額:</strong> {full_df['利用金額'].sum():,.0f} 円</p>

    <h2>月次支出推移</h2>
    {monthly_trend.to_html(index=False, float_format='{:,.0f}'.format)}

    <h2>使用者・月別 支出一覧</h2>
    {user_monthly_spending.to_html(float_format='{:,.0f}'.format)}

    <h2>支出先トップ20</h2>
    {top_merchants.to_html(index=False, float_format='{:,.0f}'.format)}

</body>
</html>
"""

# HTMLファイルとして保存
report_path = "/Users/kaya.matsumoto/projects/family-budget/expense_report.html"
with open(report_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"レポートが {report_path} に作成されました。")
