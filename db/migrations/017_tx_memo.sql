-- 017_tx_memo: optional memo on wallet transactions (receipt notes)
ALTER TABLE wallet_transactions ADD COLUMN memo TEXT;
