import { MachineState } from '../state/MachineState'
import { HaltReason } from '../state/HaltReason'
import { Stack, StackError } from '../state/Stack'
import { TraceCollector } from '../trace/TraceCollector'
import { TraceEventBuilder } from '../trace/TraceEvent'
import { Word256 } from '../types/Word256'
import { getOpcodeName, isPushOpcode, getPushBytes, Opcode } from '../opcodes/Opcode'
import { Host } from '../host/Host'

// Import opcode implementations
import {
  executeAdd,
  executeMul,
  executeSub,
  executeDiv,
  executeSdiv,
  executeMod,
  executeSmod,
  executeAddmod,
  executeMulmod,
  executeExp,
  executeSignextend,
} from '../opcodes/arithmetic'
import { executeStop } from '../opcodes/system'
import {
  executeLT,
  executeGT,
  executeSLT,
  executeSGT,
  executeEQ,
  executeISZERO,
} from '../opcodes/comparison'
import {
  executeAND,
  executeOR,
  executeXOR,
  executeNOT,
  executeBYTE,
  executeSHL,
  executeSHR,
  executeSAR,
} from '../opcodes/bitwise'
import {
  executePC,
  executeJUMP,
  executeJUMPI,
  executeJUMPDEST,
  buildJumpDestinations,
} from '../opcodes/controlflow'
import { executePOP, executeDUP, executeSWAP } from '../opcodes/stack'
import { executeMLOAD, executeMSTORE, executeMSTORE8, executeMSIZE } from '../opcodes/memory'
import {
  executeCALLDATALOAD,
  executeCALLDATASIZE,
  executeCALLDATACOPY,
  executeRETURN,
  executeREVERT,
} from '../opcodes/data'
import { executeSLOAD, executeSSTORE } from '../opcodes/storage'
import { executeLOG0, executeLOG1, executeLOG2, executeLOG3, executeLOG4 } from '../opcodes/logging'
import { executeBALANCE, executeSELFBALANCE } from '../opcodes/account'
import {
  executeADDRESS,
  executeORIGIN,
  executeCALLER,
  executeCALLVALUE,
  executeGASPRICE,
  executeGAS,
} from '../opcodes/environment'
import {
  executeBLOCKHASH,
  executeCOINBASE,
  executeTIMESTAMP,
  executeNUMBER,
  executeDIFFICULTY,
  executeGASLIMIT,
  executeCHAINID,
  executeBASEFEE,
} from '../opcodes/blockinfo'
import {
  executeCODESIZE,
  executeCODECOPY,
  executeEXTCODESIZE,
  executeEXTCODECOPY,
  executeEXTCODEHASH,
} from '../opcodes/code'
import { executeKECCAK256 } from '../opcodes/crypto'

/**
 * Interpreter - The core EVM interpreter
 *
 * Executes bytecode one instruction at a time, maintaining machine state
 * and emitting trace events for observability.
 */

export interface InterpreterConfig {
  bytecode: Uint8Array
  initialGas: bigint
  calldata?: Uint8Array
  host: Host
}

export class Interpreter {
  private bytecode: Uint8Array
  private calldata: Uint8Array
  private state: MachineState
  private stack: Stack
  private trace: TraceCollector
  private validJumpDests: Set<number>
  private host: Host

  constructor(config: InterpreterConfig) {
    this.bytecode = config.bytecode
    this.calldata = config.calldata || new Uint8Array(0)
    this.state = new MachineState(config.initialGas)
    this.stack = new Stack()
    this.trace = new TraceCollector()
    this.host = config.host

    // Phase 2: Build valid jump destinations
    this.validJumpDests = buildJumpDestinations(this.bytecode)
  }

  /**
   * Execute a single instruction
   * Returns true if execution should continue, false if halted
   */
  step(): boolean {
    if (this.state.halted) {
      return false
    }

    // Check if PC is within bytecode bounds
    if (this.state.pc >= this.bytecode.length) {
      this.state.halt(HaltReason.STOP)
      const event = TraceEventBuilder.halt(
        this.trace.getNextIndex(),
        this.state.pc,
        this.state.gasRemaining,
        HaltReason.STOP
      )
      this.trace.record(event)
      return false
    }

    // Fetch opcode
    const opcode = this.bytecode[this.state.pc]
    const opcodeName = getOpcodeName(opcode)

    // Emit opcode start event
    const startEvent = TraceEventBuilder.opcodeStart(
      this.trace.getNextIndex(),
      this.state.pc,
      this.state.gasRemaining,
      opcode,
      opcodeName
    )
    this.trace.record(startEvent)

    try {
      // Dispatch to opcode handler
      this.executeOpcode(opcode)
    } catch (error) {
      if (error instanceof StackError) {
        const reason = error.message.includes('overflow')
          ? HaltReason.STACK_OVERFLOW
          : HaltReason.STACK_UNDERFLOW
        this.state.halt(reason)
      } else if (error instanceof Error && error.message === 'Out of gas') {
        // Already halted in chargeGas
      } else {
        throw error
      }
    }

    // Emit halt event if halted
    if (this.state.halted && this.state.haltReason) {
      const haltEvent = TraceEventBuilder.halt(
        this.trace.getNextIndex(),
        this.state.pc,
        this.state.gasRemaining,
        this.state.haltReason
      )
      this.trace.record(haltEvent)
      return false
    }

    return !this.state.halted
  }

  /**
   * Run execution until halt
   */
  run(): void {
    while (this.step()) {
      // Continue until halted
    }
  }

  /**
   * Execute a specific opcode
   */
  private executeOpcode(opcode: number): void {
    // Handle PUSH operations
    if (isPushOpcode(opcode)) {
      this.executePush(opcode)
      return
    }

    // Handle DUP operations
    if (opcode >= 0x80 && opcode <= 0x8f) {
      executeDUP(opcode, this.state, this.stack, this.trace)
      return
    }

    // Handle SWAP operations
    if (opcode >= 0x90 && opcode <= 0x9f) {
      executeSWAP(opcode, this.state, this.stack, this.trace)
      return
    }

    // Dispatch to specific opcode handlers
    switch (opcode) {
      case Opcode.STOP:
        executeStop(this.state, this.stack, this.trace)
        break

      case Opcode.ADD:
        executeAdd(this.state, this.stack, this.trace)
        break

      case Opcode.MUL:
        executeMul(this.state, this.stack, this.trace)
        break

      case Opcode.SUB:
        executeSub(this.state, this.stack, this.trace)
        break

      case Opcode.DIV:
        executeDiv(this.state, this.stack, this.trace)
        break

      case Opcode.SDIV:
        executeSdiv(this.state, this.stack, this.trace)
        break

      case Opcode.MOD:
        executeMod(this.state, this.stack, this.trace)
        break

      case Opcode.SMOD:
        executeSmod(this.state, this.stack, this.trace)
        break

      case Opcode.ADDMOD:
        executeAddmod(this.state, this.stack, this.trace)
        break

      case Opcode.MULMOD:
        executeMulmod(this.state, this.stack, this.trace)
        break

      case Opcode.EXP:
        executeExp(this.state, this.stack, this.trace)
        break

      case Opcode.SIGNEXTEND:
        executeSignextend(this.state, this.stack, this.trace)
        break

      // Cryptographic operations
      case Opcode.KECCAK256:
        executeKECCAK256(this.state, this.stack, this.trace)
        break

      // Comparison operations
      case Opcode.LT:
        executeLT(this.state, this.stack, this.trace)
        break

      case Opcode.GT:
        executeGT(this.state, this.stack, this.trace)
        break

      case Opcode.SLT:
        executeSLT(this.state, this.stack, this.trace)
        break

      case Opcode.SGT:
        executeSGT(this.state, this.stack, this.trace)
        break

      case Opcode.EQ:
        executeEQ(this.state, this.stack, this.trace)
        break

      case Opcode.ISZERO:
        executeISZERO(this.state, this.stack, this.trace)
        break

      // Bitwise operations
      case Opcode.AND:
        executeAND(this.state, this.stack, this.trace)
        break

      case Opcode.OR:
        executeOR(this.state, this.stack, this.trace)
        break

      case Opcode.XOR:
        executeXOR(this.state, this.stack, this.trace)
        break

      case Opcode.NOT:
        executeNOT(this.state, this.stack, this.trace)
        break

      case Opcode.BYTE:
        executeBYTE(this.state, this.stack, this.trace)
        break

      case Opcode.SHL:
        executeSHL(this.state, this.stack, this.trace)
        break

      case Opcode.SHR:
        executeSHR(this.state, this.stack, this.trace)
        break

      case Opcode.SAR:
        executeSAR(this.state, this.stack, this.trace)
        break

      // Stack operations
      case Opcode.POP:
        executePOP(this.state, this.stack, this.trace)
        break

      // Phase 3: Memory operations
      case Opcode.MLOAD:
        executeMLOAD(this.state, this.stack, this.trace)
        break

      case Opcode.MSTORE:
        executeMSTORE(this.state, this.stack, this.trace)
        break

      case Opcode.MSTORE8:
        executeMSTORE8(this.state, this.stack, this.trace)
        break

      case Opcode.MSIZE:
        executeMSIZE(this.state, this.stack, this.trace)
        break

      // Phase 3: Calldata operations
      case Opcode.CALLDATALOAD:
        executeCALLDATALOAD(this.state, this.stack, this.trace, this.calldata)
        break

      case Opcode.CALLDATASIZE:
        executeCALLDATASIZE(this.state, this.stack, this.trace, this.calldata)
        break

      case Opcode.CALLDATACOPY:
        executeCALLDATACOPY(this.state, this.stack, this.trace, this.calldata)
        break

      // Phase 3: Return operations
      case Opcode.RETURN:
        executeRETURN(this.state, this.stack, this.trace)
        break

      case Opcode.REVERT:
        executeREVERT(this.state, this.stack, this.trace)
        break

      // Phase 2: Control flow operations
      case Opcode.PC:
        executePC(this.state, this.stack, this.trace)
        break

      case Opcode.JUMP:
        executeJUMP(this.state, this.stack, this.trace, this.bytecode, this.validJumpDests)
        break

      case Opcode.JUMPI:
        executeJUMPI(this.state, this.stack, this.trace, this.bytecode, this.validJumpDests)
        break

      case Opcode.JUMPDEST:
        executeJUMPDEST(this.state, this.stack, this.trace)
        break

      // Phase 4: Storage operations
      case Opcode.SLOAD:
        executeSLOAD(this.state, this.stack, this.trace, this.host)
        break

      case Opcode.SSTORE:
        executeSSTORE(this.state, this.stack, this.trace, this.host)
        break

      // Phase 4: Logging operations
      case Opcode.LOG0:
        executeLOG0(this.state, this.stack, this.trace, this.host)
        break

      case Opcode.LOG1:
        executeLOG1(this.state, this.stack, this.trace, this.host)
        break

      case Opcode.LOG2:
        executeLOG2(this.state, this.stack, this.trace, this.host)
        break

      case Opcode.LOG3:
        executeLOG3(this.state, this.stack, this.trace, this.host)
        break

      case Opcode.LOG4:
        executeLOG4(this.state, this.stack, this.trace, this.host)
        break

      // Phase 4: Account balance operations
      case Opcode.BALANCE:
        executeBALANCE(this.state, this.stack, this.trace, this.host)
        break

      case Opcode.SELFBALANCE:
        executeSELFBALANCE(this.state, this.stack, this.trace, this.host)
        break

      // Phase 4: Environment opcodes
      case Opcode.ADDRESS:
        executeADDRESS(this.state, this.stack, this.trace, this.host)
        break

      case Opcode.ORIGIN:
        executeORIGIN(this.state, this.stack, this.trace, this.host)
        break

      case Opcode.CALLER:
        executeCALLER(this.state, this.stack, this.trace, this.host)
        break

      case Opcode.CALLVALUE:
        executeCALLVALUE(this.state, this.stack, this.trace, this.host)
        break

      case Opcode.GASPRICE:
        executeGASPRICE(this.state, this.stack, this.trace, this.host)
        break

      case Opcode.GAS:
        executeGAS(this.state, this.stack, this.trace)
        break

      // Phase 4: Block info opcodes
      case Opcode.BLOCKHASH:
        executeBLOCKHASH(this.state, this.stack, this.trace, this.host)
        break

      case Opcode.COINBASE:
        executeCOINBASE(this.state, this.stack, this.trace, this.host)
        break

      case Opcode.TIMESTAMP:
        executeTIMESTAMP(this.state, this.stack, this.trace, this.host)
        break

      case Opcode.NUMBER:
        executeNUMBER(this.state, this.stack, this.trace, this.host)
        break

      case Opcode.DIFFICULTY:
        executeDIFFICULTY(this.state, this.stack, this.trace, this.host)
        break

      case Opcode.GASLIMIT:
        executeGASLIMIT(this.state, this.stack, this.trace, this.host)
        break

      case Opcode.CHAINID:
        executeCHAINID(this.state, this.stack, this.trace, this.host)
        break

      case Opcode.BASEFEE:
        executeBASEFEE(this.state, this.stack, this.trace, this.host)
        break

      // Phase 4: Code opcodes
      case Opcode.CODESIZE:
        executeCODESIZE(this.state, this.stack, this.trace, this.bytecode)
        break

      case Opcode.CODECOPY:
        executeCODECOPY(this.state, this.stack, this.trace, this.bytecode)
        break

      case Opcode.EXTCODESIZE:
        executeEXTCODESIZE(this.state, this.stack, this.trace, this.host)
        break

      case Opcode.EXTCODECOPY:
        executeEXTCODECOPY(this.state, this.stack, this.trace, this.host)
        break

      case Opcode.EXTCODEHASH:
        executeEXTCODEHASH(this.state, this.stack, this.trace, this.host)
        break

      default:
        this.state.halt(HaltReason.INVALID_OPCODE)
        return
    }
  }

  /**
   * Execute PUSH operation
   */
  private executePush(opcode: number): void {
    const numBytes = getPushBytes(opcode)

    // Charge gas (3 for PUSH)
    this.state.chargeGas(3n)
    const gasEvent = TraceEventBuilder.gasCharge(
      this.trace.getNextIndex(),
      this.state.pc,
      this.state.gasRemaining,
      3n,
      `PUSH${numBytes}`
    )
    this.trace.record(gasEvent)

    // Read bytes to push
    let value = 0n
    for (let i = 1; i <= numBytes; i++) {
      if (this.state.pc + i < this.bytecode.length) {
        value = (value << 8n) | BigInt(this.bytecode[this.state.pc + i])
      } else {
        value = value << 8n
      }
    }

    // Push to stack
    const word = Word256.from(value)
    this.stack.push(word)

    // Emit stack push event
    const pushEvent = TraceEventBuilder.stackPush(
      this.trace.getNextIndex(),
      this.state.pc,
      this.state.gasRemaining,
      word
    )
    this.trace.record(pushEvent)

    // Advance PC (opcode + data bytes)
    this.state.pc += 1 + numBytes
  }

  /**
   * Get current machine state
   */
  getState(): MachineState {
    return this.state
  }

  /**
   * Get current stack
   */
  getStack(): Stack {
    return this.stack
  }

  /**
   * Get trace collector
   */
  getTrace(): TraceCollector {
    return this.trace
  }

  /**
   * Check if execution has halted
   */
  isHalted(): boolean {
    return this.state.halted
  }

  /**
   * Get halt reason (if halted)
   */
  getHaltReason(): HaltReason | undefined {
    return this.state.haltReason
  }
}
