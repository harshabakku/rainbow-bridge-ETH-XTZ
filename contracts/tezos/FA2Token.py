# FA2
# ===
#
# Multi-asset contract.
#
# Cf. https://gitlab.com/tzip/tzip/-/blob/master/proposals/tzip-12/fa2_interface.mligo
#
# WARNING: This script requires the /dev version of SmartPy.
#

import smartpy as sp


class FA2_config:
    def __init__(self,
                 debug_mode                   = False,
                 single_asset                 = False,
                 add_mutez_transfer           = False,
                 readable                     = True,
                 force_layouts                = True,
                 support_operator             = True,
                 assume_consecutive_token_ids = True,
                 add_permissions_descriptor   = True):
        if debug_mode:
            self.my_map = sp.map
        else:
            self.my_map = sp.big_map
        # Use maps instead of big-maps and things like that (i.e. make
        # inspection of the state easier).

        self.single_asset                 = single_asset
        # Make the contract work only for token-id 0

        self.readable                     = readable
        # User-accounts are big-maps: (user-address * token-id) -> ownership-info
        #
        # For Babylon, one should use `readable = False` to use `PACK` on the pair,
        # we keep this option around for benchmarking purposes.

        self.force_layouts                = force_layouts
        # The spec requires records and variants to be right-combs; we keep
        # this parameter around to be able to compare performance & code-size.

        self.support_operator             = support_operator
        # The operator entry-points always have to be there, but there is
        # definitely a use-case for having them completely empty (saving
        # storage and gas when `support_operator` is `False).

        self.assume_consecutive_token_ids = assume_consecutive_token_ids
        # For a previous version of the TZIP specification, it was necessary to keep
        # track of the set of all tokens in the contract.
        # The set of tokens is for now still available; this parameter guides how to
        # implement it:
        # If true we don't need a set of token ids, just to know how many there are.

        self.add_mutez_transfer           = add_mutez_transfer
        # Add an entry point for the administrator to transfer tez potentially
        # in the contract's balance.

        self.add_permissions_descriptor   = add_permissions_descriptor
        # Add the `permissions_descriptor` entry-point; it is part of the specification
        # but costs gas and storage so we keep the option of not
        # adding it.

        name = "FA2"
        if debug_mode:
            name += "-debug"
        if single_asset:
            name += "-single_asset"
        if add_mutez_transfer:
            name += "-mutez"
        if not readable:
            name += "-no_readable"
        if not force_layouts:
            name += "-no_layout"
        if not support_operator:
            name += "-no_ops"
        if not assume_consecutive_token_ids:
            name += "-no_toknat"
        if not add_permissions_descriptor:
            name += "-no_perm"
        self.name = name



token_id_type = sp.TNat

class Error_message:
    def token_undefined(): return "TOKEN_UNDEFINED"
    def insufficient_balance(): return "INSUFFICIENT_BALANCE"
    def not_operator(): return "NOT_OPERATOR"
    def not_owner(): return "NOT_OWNER"

# This is the new type from the spec:
#
#     type transfer = {
#       from_ : address;
#       txs: {
#         to_ : address;
#         token_id : token_id;
#         amount : nat;
#       } list
#     } list
#
class Batch_transfer:
    def __init__(self, config):
        self.config = config
    def get_transfer_type(self):
        tx_type = sp.TRecord(to_ = sp.TAddress,
                             token_id = token_id_type,
                             amount = sp.TNat)
        if self.config.force_layouts:
            tx_type = tx_type.layout(
                ("to_", ("token_id", "amount"))
            )
        transfer_type = sp.TRecord(from_ = sp.TAddress,
                                   txs = sp.TList(tx_type)).layout(
                                       ("from_", "txs"))
        return transfer_type
    def get_type(self):
        return sp.TList(self.get_transfer_type())
    def item(self, from_, txs):
        v = sp.record(from_ = from_, txs = txs)
        return sp.set_type_expr(v, self.get_transfer_type())

class Operator_param:
    def __init__(self, config):
        self.config = config
    def get_type(self):
        t = sp.TRecord(
            owner = sp.TAddress,
            operator = sp.TAddress)
        if self.config.force_layouts:
            t = t.layout(("owner", "operator"))
        return t
    def make(self, owner, operator):
        r = sp.record(owner = owner,
                      operator = operator)
        return sp.set_type_expr(r, self.get_type())
    def is_operator_response_type(self):
        return sp.TRecord(
            operator = self.get_type(),
            is_operator = sp.TBool)
    def make_is_operator_response(self, operator, is_operator):
        return sp.record(operator = operator, is_operator = is_operator)
    def is_operator_request_type(self):
        return sp.TRecord(
            operator = self.get_type(),
            callback = sp.TContract(self.is_operator_response_type()))

class Ledger_value:
    def get_type():
        return sp.TRecord(balance = sp.TNat)
    def make(balance):
        return sp.record(balance = balance)

class Ledger_key:
    def __init__(self, config):
        self.config = config
    def make(self, user, token):
        user = sp.set_type_expr(user, sp.TAddress)
        token = sp.set_type_expr(token, token_id_type)
        if self.config.single_asset:
            result = user
        else:
            result = sp.pair(user, token)
        if self.config.readable:
            return result
        else:
            return sp.pack(result)

class Operator_set:
    def __init__(self, config):
        self.config = config
    def inner_type(self):
        return sp.TRecord(owner = sp.TAddress,
                          operator = sp.TAddress).layout(("owner", "operator"))
    def key_type(self):
        if self.config.readable:
            return self.inner_type()
        else:
            return sp.TBytes
    def make(self):
        return self.config.my_map(tkey = self.key_type(), tvalue = sp.TUnit)
    def make_key(self, owner, operator):
        metakey = sp.record(owner = owner, operator = operator)
        metakey = sp.set_type_expr(metakey, self.inner_type())
        if self.config.readable:
            return metakey
        else:
            return sp.pack(metakey)
    def add(self, set, owner, operator):
        set[self.make_key(owner, operator)] = sp.unit
    def remove(self, set, owner, operator):
        del set[self.make_key(owner, operator)]
    def is_member(self, set, owner, operator):
        return set.contains(self.make_key(owner, operator))

class Balance_of:
    def request_type():
        return sp.TRecord(
            owner = sp.TAddress,
            token_id = token_id_type)
    def response_type():
        return sp.TList(
            sp.TRecord(
                request = Balance_of.request_type(),
                balance = sp.TNat))

class Total_supply:
    def request_type():
        return token_id_type
    def response_type():
        return sp.TList(
            sp.TRecord(
                token_id = token_id_type,
                total_supply = sp.TNat))

class Token_meta_data:
    def __init__(self, config):
        self.config = config
    def get_type(self):
        t = sp.TRecord(
            token_id = token_id_type,
            symbol = sp.TString,
            name = sp.TString,
            decimals = sp.TNat,
            extras = sp.TMap(sp.TString, sp.TString)
        )
        if self.config.force_layouts:
            t = t.layout(("token_id",
                          ("symbol",
                           ("name",
                            ("decimals", "extras")))))
        return t
    def set_type_and_layout(self, expr):
        sp.set_type(expr, self.get_type())
    def request_type(self):
        return Total_supply.request_type()

class Permissions_descriptor:
    def __init__(self, config):
        self.config = config
    def get_type(self):
        operator_transfer_policy = sp.TVariant(
            no_transfer = sp.TUnit,
            owner_transfer = sp.TUnit,
            owner_or_operator_transfer = sp.TUnit)
        if self.config.force_layouts:
            operator_transfer_policy = operator_transfer_policy.layout(
                                       ("no_transfer",
                                        ("owner_transfer",
                                         "owner_or_operator_transfer")))
        owner_transfer_policy =  sp.TVariant(
            owner_no_op = sp.TUnit,
            optional_owner_hook = sp.TUnit,
            required_owner_hook = sp.TUnit)
        if self.config.force_layouts:
            owner_transfer_policy = owner_transfer_policy.layout(
                                       ("owner_no_op",
                                        ("optional_owner_hook",
                                         "required_owner_hook")))
        custom_permission_policy = sp.TRecord(
            tag = sp.TString,
            config_api = sp.TOption(sp.TAddress))
        main = sp.TRecord(
            operator = operator_transfer_policy,
            receiver = owner_transfer_policy,
            sender   = owner_transfer_policy,
            custom   = sp.TOption(custom_permission_policy))
        if self.config.force_layouts:
            main = main.layout(("operator",
                                ("receiver",
                                 ("sender", "custom"))))
        return main
    def set_type_and_layout(self, expr):
        sp.set_type(expr, self.get_type())
    def make(self):
        def uv(s):
            return sp.variant(s, sp.unit)
        operator = ("owner_or_operator_transfer"
                    if self.config.support_operator
                    else "owner_transfer")
        v = sp.record(
            operator = uv(operator),
            receiver = uv("owner_no_op"),
            sender = uv("owner_no_op"),
            custom = sp.none
            )
        v = sp.set_type_expr(v, self.get_type())
        return v

class Token_id_set:
    def __init__(self, config):
        self.config = config
    def empty(self):
        if self.config.assume_consecutive_token_ids:
            # The "set" is its cardinal.
            return sp.nat(0)
        else:
            return sp.set(t = token_id_type)
    def add(self, metaset, v):
        if self.config.assume_consecutive_token_ids:
            metaset.set(sp.max(metaset, v + 1))
        else:
            metaset.add(v)

def mutez_transfer(contract, params):
    sp.verify(sp.sender == contract.data.administrator)
    sp.set_type(params.destination, sp.TAddress)
    sp.set_type(params.amount, sp.TMutez)
    sp.send(params.destination, params.amount)

class FA2(sp.Contract):
    def __init__(self, config, admin):
        self.config = config
        self.operator_set           = Operator_set(self.config)
        self.operator_param         = Operator_param(self.config)
        self.token_id_set           = Token_id_set(self.config)
        self.ledger_key             = Ledger_key(self.config)
        self.token_meta_data        = Token_meta_data(self.config)
        self.permissions_descriptor_ = Permissions_descriptor(self.config)
        self.batch_transfer    = Batch_transfer(self.config)
        if  self.config.add_mutez_transfer:
            self.transfer_mutez = sp.entry_point(mutez_transfer)
        if  self.config.add_permissions_descriptor:
            def permissions_descriptor(self, params):
                sp.set_type(params, sp.TContract(self.permissions_descriptor_.get_type()))
                v = self.permissions_descriptor_.make()
                sp.transfer(v, sp.mutez(0), params)
            self.permissions_descriptor = sp.entry_point(permissions_descriptor)
        self.init(
            paused = False,
            ledger =
                self.config.my_map(tvalue = Ledger_value.get_type()),
            tokens =
                self.config.my_map(tvalue = sp.TRecord(
                    total_supply = sp.TNat,
                    metadata = self.token_meta_data.get_type()
                )),
            operators = self.operator_set.make(),
            administrator = admin,
            all_tokens = self.token_id_set.empty(),
            # This field is a placeholder, the build system will replace
            # the annotation with a version-string:
            metadata_string = sp.unit
        )

    @sp.entry_point
    def set_pause(self, params):
        sp.verify(sp.sender == self.data.administrator)
        self.data.paused = params

    @sp.entry_point
    def set_administrator(self, params):
        sp.verify(sp.sender == self.data.administrator)
        self.data.administrator = params

    @sp.entry_point
    def mint(self, params):
        sp.verify(sp.sender == self.data.administrator)
        # We don't check for pauseness because we're the admin.
        if self.config.single_asset:
            sp.verify(params.token_id == 0, "single-asset: token-id <> 0")
        user = self.ledger_key.make(params.address, params.token_id)
        self.token_id_set.add(self.data.all_tokens, params.token_id)
        sp.if self.data.ledger.contains(user):
            self.data.ledger[user].balance += params.amount
        sp.else:
            self.data.ledger[user] = Ledger_value.make(params.amount)
        sp.if self.data.tokens.contains(params.token_id):
             self.data.tokens[params.token_id].total_supply += params.amount
        sp.else:
             self.data.tokens[params.token_id] = sp.record(
                 total_supply = params.amount,
                 metadata = sp.record(
                     token_id = params.token_id,
                     symbol = params.symbol,
                     name = "", # Consered useless here
                     decimals = 0,
                     extras = sp.map()
                 )
             )

def add_test(config, is_default = True):
    if not sp.in_browser and os.environ.get("SELECT_TEST", None) is not None and os.environ.get("SELECT_TEST", None) != config.name:
        return
    @sp.add_test(name = config.name, is_default = is_default)
    def test():
        scenario = sp.test_scenario()
        scenario.h1("FA2 Minting")
        scenario.table_of_contents()
        # sp.test_account generates ED25519 key-pairs deterministically:
        admin = sp.test_account("Administrator")
        alice = sp.test_account("Alice")
        bob   = sp.test_account("Robert")
        
        # Let's display the accounts:
        scenario.h2("Accounts")
        scenario.show([admin])
        c1 = FA2(config, admin.address)
        scenario += c1
        scenario.h2("ERC20-FA2 Minting")
        scenario.p("Contract mints locked ERC20s equivalent FA2s")
        scenario += c1.mint(address = alice.address,
                            amount = 10000,
                            symbol = 'ERC20-FA2',
                            token_id = 0).run(sender = admin)
        c2 = FA2(config, sp.address('tz1UPpoDChZAMNURJPqNcwKi8PCjkqQTeBZn'))
        scenario += c2



################################################################################
# Global Parameters

def global_parameter(env_var, default):
    try:
        if os.environ[env_var] == "true" :
            return True
        if os.environ[env_var] == "false" :
            return False
        return default
    except:
        return default

def environment_config():
    return FA2_config(
        debug_mode                   = global_parameter("debug_mode", False),
        single_asset                 = global_parameter("single_asset", False),
        add_mutez_transfer           = global_parameter("add_mutez_transfer", False),
        readable                     = global_parameter("readable", True),
        force_layouts                = global_parameter("force_layouts", True),
        support_operator             = global_parameter("support_operator", True),
        assume_consecutive_token_ids = global_parameter("assume_consecutive_token_ids", True),
        add_permissions_descriptor   = global_parameter("add_permissions_descriptor", True))

if "templates" not in __name__:
    add_test(environment_config())
    add_test(FA2_config(debug_mode = True)                              , is_default = not sp.in_browser)
    add_test(FA2_config(single_asset = True)                            , is_default = not sp.in_browser)
    add_test(FA2_config(single_asset = True, add_mutez_transfer = True) , is_default = not sp.in_browser)
    add_test(FA2_config(readable = False)                               , is_default = not sp.in_browser)
    add_test(FA2_config(force_layouts = False)                          , is_default = not sp.in_browser)
    add_test(FA2_config(debug_mode = True, support_operator = False)    , is_default = not sp.in_browser)
    add_test(FA2_config(assume_consecutive_token_ids = False)           , is_default = not sp.in_browser)
    add_test(FA2_config(add_mutez_transfer = True)                      , is_default = not sp.in_browser)