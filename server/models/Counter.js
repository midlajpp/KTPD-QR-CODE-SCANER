import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  seq: {
    type: Number,
    default: 0
  }
});

// Atomic sequence generator method
counterSchema.statics.getNextSequence = async function (sequenceName) {
  const counter = await this.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

// Formats number into KTPD-0001 format
counterSchema.statics.formatMemberId = function (seqNumber) {
  return `KTPD-${String(seqNumber).padStart(4, '0')}`;
};

const Counter = mongoose.model('Counter', counterSchema);

export default Counter;

