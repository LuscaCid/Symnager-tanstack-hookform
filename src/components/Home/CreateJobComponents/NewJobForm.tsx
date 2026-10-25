
import { PenBox, PenLine, ChevronDown, KeyRound } from 'lucide-react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod';
import { NewJobFormSchema, NewJobFormSchemaType, UsersProperties } from '@/@types/CreateJob';
import { SelectClientSection } from './SelectClientSection';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generateObjectToSend } from '../../../Functions/newJobFunctions';
import { NewJobFormReducerObject } from "../../../reducers/NewJobForm";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ordersService } from '@/services/resources';
import { useLookups, useTechnicians } from '@/lib/hooks';
import { Button, ComboboxField, SelectField, TextAreaField, TextField } from '@/components/ui';
import { PRIORITIES } from '@/@types/api';
import { formatOrderNumber, PRIORITY_LABEL } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { ChecklistEntry } from '@/@types/api';
import { answeredOnly, ChecklistEditor } from '@/components/orders/ChecklistEditor';

const defaultValues: NewJobFormSchemaType = {
  device : "",
  description : "",
  price : "",
  tag : "",
  priority : "NORMAL",
  device_type : "",
  brand : "",
  model : "",
  serial : "",
  accessories : "",
  condition : "",
  device_password : "",
  technician_id : "",
  due_date : "",
}

export function NewJobForm ({ initialClient } : { initialClient? : UsersProperties | null }) {

  const {
    userSelected,
    handleSelectUser,
    handleRemoveUserSelected
  } = NewJobFormReducerObject(initialClient ?? null)

  const [showDetails, setShowDetails] = useState(false)
  const [clientError, setClientError] = useState(false)
  const [checklist, setChecklist] = useState<ChecklistEntry[]>([])
  const navigate = useNavigate()
  const deviceTypes = useLookups('DEVICE_TYPE')
  const brands = useLookups('BRAND')
  const accessories = useLookups('ACCESSORY')
  const technicians = useTechnicians()

  const newJobFormProps = useForm<NewJobFormSchemaType>({
    resolver : zodResolver(NewJobFormSchema),
    defaultValues,
  })
  //form provider to inputs and handle submit form

  const {handleSubmit, reset, register, formState : { errors }} = newJobFormProps

  const queryClient = useQueryClient()

  const { mutateAsync: addNewJobMutation, isPending } = useMutation({
    mutationFn : ordersService.create,
    onSuccess : (order) => {
      queryClient.invalidateQueries({ queryKey : ['history'] })
      queryClient.invalidateQueries({ queryKey : ['orders'] })
      queryClient.invalidateQueries({ queryKey : ['dashboard'] })
      toast.success(`${formatOrderNumber(order.number)} criada`, {
        description : `${order.device} — código de rastreio ${order.tracking_code}`,
        action : { label : 'Imprimir', onClick : () => navigate(`/ordens/${order.order_id}/imprimir`) },
        cancel : { label : 'Abrir', onClick : () => navigate(`/ordens/${order.order_id}`) },
        duration : 8000,
      })
      reset(defaultValues)
      setChecklist([])
      handleRemoveUserSelected()
    }
  })

  async function handleSubmitForm(data : NewJobFormSchemaType) {
    if(!userSelected) {
      setClientError(true)
      return
    }
    await addNewJobMutation(generateObjectToSend(data, userSelected, answeredOnly(checklist)))
  }

  function selectUser(user : UsersProperties) {
    setClientError(false)
    handleSelectUser(user)
  }

  const section = 'flex flex-col gap-3'
  const sectionTitle = 'text-xs font-medium uppercase tracking-wider text-faint'

  return (
    <FormProvider {...newJobFormProps}>
      <form
        noValidate
        onSubmit={handleSubmit(handleSubmitForm, () => !userSelected && setClientError(true))}
        className="bg-surface border border-line rounded-xl shadow-sm mx-4 mb-4 p-5 flex flex-col gap-6"
      >
        <header className='flex justify-between items-center'>
          <h2 className='text-base font-semibold text-fg'>Nova ordem de serviço</h2>
          <PenBox size={18} className='text-faint' />
        </header>

        <section className={section}>
          <h3 className={sectionTitle}>Cliente</h3>
          <SelectClientSection
            selectedUser={userSelected}
            handleSelectUser={selectUser}
            handleRemoveSelectedUser={handleRemoveUserSelected}
            error={clientError}
          />
        </section>

        <section className={section}>
          <h3 className={sectionTitle}>Equipamento</h3>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3'>
            <TextField
              wrapperClassName='sm:col-span-2'
              label='Equipamento'
              placeholder='ex.: Samsung Galaxy S20'
              error={errors.device?.message}
              {...register('device')}
            />
            <SelectField label='Tipo de equipamento' placeholder='Selecione o tipo' searchable {...register('device_type')}>
              <option value=''>Não informado</option>
              {deviceTypes.data?.map((d) => <option key={d.lookup_id} value={d.name}>{d.name}</option>)}
            </SelectField>
            <ComboboxField
              label='Marca'
              placeholder='Selecione ou digite'
              options={(brands.data ?? []).map((b) => b.name)}
              {...register('brand')}
            />
            <TextField label='Modelo' placeholder='ex.: SM-G980F' {...register('model')} />
            <TextField label='Nº de série / IMEI' {...register('serial')} />
          </div>
        </section>

        <section className={section}>
          <h3 className={sectionTitle}>Problema relatado</h3>
          <TextAreaField
            label='Defeito relatado pelo cliente'
            hideLabel
            placeholder='Descreva o problema relatado pelo cliente'
            className='min-h-24'
            error={errors.description?.message}
            {...register('description')}
          />
        </section>

        <section className={section}>
          <h3 className={sectionTitle}>Orçamento e prazo</h3>
          <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-3 gap-y-3'>
            <div className='relative'>
              <TextField
                label='Valor do conserto'
                placeholder='0,00'
                inputMode='decimal'
                className='pl-9'
                hint='Vira o item "Orçamento inicial"'
                error={errors.price?.message}
                {...register('price')}
              />
              <span className='absolute left-3 top-[34px] text-sm text-faint pointer-events-none'>R$</span>
            </div>
            <SelectField label='Prioridade' {...register('priority')}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
            </SelectField>
            <SelectField label='Técnico responsável' placeholder='Definir depois' {...register('technician_id')}>
              <option value=''>Definir depois</option>
              {technicians.data?.map((t) => <option key={t.user_id} value={t.user_id}>{t.name}</option>)}
            </SelectField>
            <TextField label='Previsão de entrega' type='date' {...register('due_date')} />
            <TextField
              wrapperClassName='sm:col-span-1 xl:col-span-2'
              label='Tags'
              placeholder='separe por vírgula'
              {...register('tag')}
            />
          </div>
        </section>

        <section className='flex flex-col gap-3'>
          <button
            type='button'
            onClick={() => setShowDetails((s) => !s)}
            aria-expanded={showDetails}
            className='flex items-center justify-between text-[13px] font-medium text-muted h-9 px-3 rounded-lg bg-subtle/70 hover:bg-hover hover:text-fg transition-colors'
          >
            Acessórios, senha, estado físico e checklist
            <ChevronDown size={16} className={cn('transition-transform duration-150', showDetails && 'rotate-180')} />
          </button>

          {showDetails && (
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3'>
              <ComboboxField
                label='Acessórios entregues'
                placeholder='Nenhum'
                multiple
                options={(accessories.data ?? []).map((a) => a.name)}
                {...register('accessories')}
              />
              <TextField
                label='Senha / padrão de desbloqueio'
                autoComplete='off'
                hint={<span className='inline-flex items-center gap-1'><KeyRound size={11} /> só a equipe vê</span>}
                {...register('device_password')}
              />
              <TextAreaField
                wrapperClassName='sm:col-span-2'
                label='Estado físico na entrada'
                placeholder='riscos, trincas, amassados...'
                className='min-h-16'
                {...register('condition')}
              />
              <div className='sm:col-span-2 flex flex-col gap-2 rounded-lg border border-line p-3'>
                <span className='text-[13px] font-medium text-muted'>Checklist de entrada</span>
                <ChecklistEditor value={checklist} onChange={setChecklist} />
              </div>
            </div>
          )}
        </section>

        <div className='flex justify-end pt-1 border-t border-line -mx-5 px-5 -mb-1'>
          <Button type='submit' variant='primary' loading={isPending} icon={PenLine} className='mt-4'>
            Gerar OS
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
