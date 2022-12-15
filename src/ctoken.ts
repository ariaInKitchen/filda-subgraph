import { BigInt , log} from "@graphprotocol/graph-ts"
import {
  CToken,
  Borrow,
  LiquidateBorrow,
  Mint,
  Redeem,
  RepayBorrow,
  Transfer
} from "../generated/templates/CToken/CToken"
import { Token, TokenBalance, User } from "../generated/schema"
import {
  fetchTokenSymbol,
  fetchTokenName,
  fetchTokenDecimals,
  fetchUnderlyingToken,
  convertTokenToDecimal,
  ADDRESS_ZERO,
  ONE_BI,
  ZERO_BD,
  BI_18
} from './helper'

export function handleBorrow(event: Borrow): void {
  let user = User.load(event.params.borrower.toHex())
  // user not exist
  if (!user) {
    user = new User(event.params.borrower.toHex())
    user.save()
  }

  let underlying = fetchUnderlyingToken(event.address)
  // get underlying token failed,exit
  if (underlying.toHex() == ADDRESS_ZERO) return

  let token = Token.load(underlying.toHex())
  // if token is not exist, exit
  if (!token) return

  // token address_account address_handler
  let balanceID = underlying.toHex().concat("_").concat(event.params.borrower.toHex()).concat("_Loan")
  let tokenBalance = TokenBalance.load(balanceID)
  if (!tokenBalance) {
    tokenBalance = new TokenBalance(balanceID)
    tokenBalance.handler = "Loan"
    tokenBalance.user = user.id
    tokenBalance.token = token.id
    tokenBalance.amount = ZERO_BD
  }

  tokenBalance.amount = convertTokenToDecimal(event.params.accountBorrows, token.decimals);
  tokenBalance.save()
}

export function handleLiquidateBorrow(event: LiquidateBorrow): void {

  // only handle borrower borrow reduce, the collateral amount handled in transfer event

  let user = User.load(event.params.borrower.toHex())
  if (!user) {
    user = new User(event.params.borrower.toHex())
    user.save()
  }

  let underlying = fetchUnderlyingToken(event.address)
  // get underlying token failed,exit
  if (underlying.toHex() == ADDRESS_ZERO) return

  let underlyingToken = Token.load(underlying.toHex())
  // if token is not exist, exit
  if (!underlyingToken) return

  let borrowBalanceID = underlying.toHex().concat("_").concat(event.params.borrower.toHex()).concat("_Loan")
  let borrowBalance = TokenBalance.load(borrowBalanceID)
  if (!borrowBalance) {
    borrowBalance = new TokenBalance(borrowBalanceID)
    borrowBalance.handler = "Loan"
    borrowBalance.user = user.id
    borrowBalance.token = underlyingToken.id
    borrowBalance.amount = ZERO_BD
  }
  borrowBalance.amount = borrowBalance.amount.minus(convertTokenToDecimal(event.params.repayAmount, underlyingToken.decimals))
  borrowBalance.save()
}

export function handleMint(event: Mint): void {
  let user = User.load(event.params.minter.toHex())
  if (!user) {
    user = new User(event.params.minter.toHex())
    user.save()
  }

  let token = Token.load(event.address.toHex())
  if (!token) return

  // token address_account address_handler
  let balanceID = event.address.toHex().concat("_").concat(event.params.minter.toHex()).concat("_Deposit")
  let tokenBalance = TokenBalance.load(balanceID)
  if (!tokenBalance) {
    tokenBalance = new TokenBalance(balanceID)
    tokenBalance.handler = "Deposit"
    tokenBalance.user = user.id
    tokenBalance.token = token.id
    tokenBalance.amount = ZERO_BD
  }

  tokenBalance.amount = tokenBalance.amount.plus(convertTokenToDecimal(event.params.mintTokens, token.decimals))
  tokenBalance.save()
}

export function handleRedeem(event: Redeem): void {
  let user = User.load(event.params.redeemer.toHex())
  if (!user) {
    user = new User(event.params.redeemer.toHex())
    user.save()
  }

  let token = Token.load(event.address.toHex())
  if (!token) return

  // sub user's collateral
  // token address_account address_handler
  let balanceID = event.address.toHex().concat("_").concat(event.params.redeemer.toHex()).concat("_Deposit")
  let tokenBalance = TokenBalance.load(balanceID)
  if (!tokenBalance) {
    tokenBalance = new TokenBalance(balanceID)
    tokenBalance.handler = "Deposit"
    tokenBalance.user = user.id
    tokenBalance.token = token.id
    tokenBalance.amount = ZERO_BD
  }

  tokenBalance.amount = tokenBalance.amount.minus(convertTokenToDecimal(event.params.redeemTokens, token.decimals))
  tokenBalance.save()
}

export function handleRepayBorrow(event: RepayBorrow): void {
  let user = User.load(event.params.borrower.toHex())
  if (!user) {
    user = new User(event.params.borrower.toHex())
    user.save()
  }

  let underlying = fetchUnderlyingToken(event.address)
  // get underlying token failed,exit
  if (underlying.toHex() == ADDRESS_ZERO) return

  let token = Token.load(underlying.toHex())
  if (!token) return

  // token address_account address_handler
  let balanceID = underlying.toHex().concat("_").concat(event.params.borrower.toHex()).concat("_Loan")
  let tokenBalance = TokenBalance.load(balanceID)
  if (!tokenBalance) {
    tokenBalance = new TokenBalance(balanceID)
    tokenBalance.handler = "Loan"
    tokenBalance.user = user.id
    tokenBalance.token = token.id
    tokenBalance.amount = ZERO_BD
  }

  tokenBalance.amount = convertTokenToDecimal(event.params.accountBorrows, token.decimals);
  tokenBalance.save()
}

export function handleTransfer(event: Transfer): void {
  // ignore Mint and Redeem event transfer
  if (event.params.from.toHex() == event.address.toHex() || event.params.to.toHex() == event.address.toHex()) return

  let from = User.load(event.params.from.toHex())
  if (!from) {
    from = new User(event.params.from.toHex())
    from.save()
  }

  let token = Token.load(event.address.toHex())
  if (!token) return

  // token address_account address_handler
  let balanceID = event.address.toHex().concat("_").concat(event.params.from.toHex()).concat("_Deposit")
  let tokenBalance = TokenBalance.load(balanceID)
  if (!tokenBalance) {
    tokenBalance = new TokenBalance(balanceID)
    tokenBalance.handler = "Deposit"
    tokenBalance.user = from.id
    tokenBalance.token = token.id
    tokenBalance.amount = ZERO_BD
  }

  let amount = convertTokenToDecimal(event.params.amount, token.decimals)
  tokenBalance.amount = tokenBalance.amount.minus(amount)
  tokenBalance.save()

  let to = User.load(event.params.to.toHex())
  if (!to) {
    to = new User(event.params.to.toHex())
    to.save()
  }

  // token address_account address_handler
  let toBalanceID = event.address.toHex().concat("_").concat(event.params.to.toHex()).concat("_Deposit")
  let toTokenBalance = TokenBalance.load(toBalanceID)
  if (!toTokenBalance) {
    toTokenBalance = new TokenBalance(toBalanceID)
    toTokenBalance.handler = "Deposit"
    toTokenBalance.user = to.id
    toTokenBalance.token = token.id
    toTokenBalance.amount = ZERO_BD
  }

  toTokenBalance.amount = toTokenBalance.amount.plus(amount);
  toTokenBalance.save()
}
