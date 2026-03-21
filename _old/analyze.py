

import pandas as pd
import glob

path = "/Users/kaya.matsumoto/projects/family-budget/datalake/ご利用明細*.csv"
all_files = glob.glob(path)

# 空のデータフレームを用意
df_list = []

# 各CSVファイルを読み込み、データフレームとしてリストに追加
for f in all_files:
    try:
        df = pd.read_csv(f, encoding="shift-jis", header=None, skiprows=4)
        df_list.append(df)
    except Exception as e:
        print(f"Error reading {f}: {e}")


# 全てのデータフレームを結合
full_df = pd.concat(df_list, ignore_index=True)

# カラム名を付ける
full_df.columns = [
    "利用日",
    "利用店名",
    "利用金額",
    "支払方法",
    "請求額",
    "支払区分",
    "備考",
    "請求額（外貨）",
    "現地通貨額",
    "通貨",
    "換算レート",
]

# 不要な行を削除
full_df = full_df[full_df["利用日"].str.contains("^\d{4}/\d{2}/\d{2}", na=False)]

# 利用金額を数値に変換
full_df["利用金額"] = full_df["利用金額"].str.replace(",", "").astype(float)

# 2025年6月のデータを抽出
df_202506 = full_df[full_df["利用日"].str.startswith("2025/06")]

# 2025年6月の合計利用額
total_spending_202506 = df_202506["利用金額"].sum()

# 2025年6月の利用店別の合計利用額
store_spending_202506 = df_202506.groupby("利用店名")["利用金額"].sum().sort_values(ascending=False)


print("2025年6月の合計利用額:")
print(f"{total_spending_202506:,.0f}円")

print("\n2025年6月の利用店別ランキング:")
print(store_spending_202506)

