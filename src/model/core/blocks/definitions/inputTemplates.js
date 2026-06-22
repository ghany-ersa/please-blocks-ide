// Factory functions untuk definisi input yang berulang di block definitions

export const t = {
  label:    (placeholder = 'deskripsi')         => ({ name: 'label',    type: 'text',     label: 'Label',              placeholder, required: true }),
  selector: (placeholder = 'button=Login')        => ({ name: 'selector', type: 'selector', label: 'Selector',           placeholder, required: true }),
  value:    (placeholder = 'nilai', lbl = 'Nilai') => ({ name: 'value',   type: 'value',    label: lbl,                  placeholder, required: true }),
  varName:  (placeholder = 'variabel')           => ({ name: 'varName',  type: 'text',     label: 'Simpan ke variabel', placeholder, required: true }),
  wait:     ()                                   => ({ name: 'wait',     type: 'number',   label: 'Wait (ms)',          placeholder: 'opsional',  required: false }),
  message:  ()                                   => ({ name: 'message',  type: 'text',     label: 'Pesan error (opsional)', placeholder: 'opsional', required: false }),
  actual:   (placeholder = '$variabel')          => ({ name: 'actual',   type: 'varref',   label: 'Nilai aktual',       placeholder, required: true }),
  expected: (placeholder = 'nilai', lbl = 'Nilai yang diharapkan') => ({ name: 'expected', type: 'value', label: lbl, placeholder, required: true }),
}
