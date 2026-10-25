
import { Coins, Smartphone, PenBox, PenLine, Tag, ChevronDown, KeyRound } from 'lucide-react'
import Input from "../CreateJobComponents/Input";
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
import { Button, SelectField, TextAreaField, TextField } from '@/components/ui';
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

  return (
    <FormProvider {...newJobFormProps}>
      <form
        noValidate
        onSubmit={handleSubmit(handleSubmitForm, () => !userSelected && setClientError(true))}
        className="border border-zinc-300 dark:border-zinc-800/80 rounded-md m-2 flex flex-col gap-2 pb-2"
      >
      <h1
        className='bg-zinc-200 dark:bg-zinc-800/80 rounded-t-sm border-b p-1 px-2 dark:text-zinc-300 dark:border-zinc-800 border-zinc-300 w-full text-xl text-zinc-800 font-bold flex justify-between items-center'>
        Nova ordem de serviço <PenBox size={28} />
      </h1>

      <SelectClientSection
        selectedUser={userSelected}
        handleSelectUser={selectUser}
        handleRemoveSelectedUser={handleRemoveUserSelected}
        error={clientError}
      />

      <Input
        IType="text"
        icon={Smartphone}
        input_name='device'
        input_placeholder='Equipamento (ex.: Samsung Galaxy S20)'
      />
      <textarea
        aria-label='Defeito relatado'
        className={cn(
          'p-2 mx-2 resize-y bg-transparent border dark:border-zinc-800 border-zinc-300 rounded-md shadow-md min-h-24 focus:outline-none focus:border-zinc-500 placeholder:text-zinc-400 dark:placeholder:text-zinc-600',
          errors.description && 'border-red-500 dark:border-red-500/70',
        )}
        placeholder='Descrição relatando os problemas'
        {...register('description')}
      />
      {errors.description && <span role="alert" className="mx-2 -mt-1 text-xs text-red-500">{errors.description.message}</span>}

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-2'>
        <Input
          IType="text"
          icon={Coins}
          input_name='price'
          inputMode='decimal'
          input_placeholder='Valor do conserto (orçamento)'
        />
        <Input
          IType="text"
          icon={Tag}
          input_name='tag'
          input_placeholder='Tags (separe por vírgula)'
        />
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 px-2'>
        <SelectField label='Prioridade' {...register('priority')}>
          {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
        </SelectField>
        <SelectField label='Técnico responsável' {...register('technician_id')}>
          <option value=''>Definir depois</option>
          {technicians.data?.map((t) => <option key={t.user_id} value={t.user_id}>{t.name}</option>)}
        </SelectField>
        <TextField label='Previsão de entrega' type='date' {...register('due_date')} />
      </div>

      <button
        type='button'
        onClick={() => setShowDetails((s) => !s)}
        aria-expanded={showDetails}
        className='mx-2 flex items-center justify-between text-sm font-semibold p-1 px-2 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800/80 transition duration-200'
      >
        Detalhes do equipamento (marca, série, acessórios, senha, checklist)
        <ChevronDown size={18} className={cn('transition duration-200', showDetails && 'rotate-180')} />
      </button>

      {showDetails && (
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 px-2'>
          <SelectField label='Tipo de equipamento' {...register('device_type')}>
            <option value=''>—</option>
            {deviceTypes.data?.map((d) => <option key={d.lookup_id} value={d.name}>{d.name}</option>)}
          </SelectField>
          <TextField label='Marca' list='brands-list' {...register('brand')} />
          <datalist id='brands-list'>
            {brands.data?.map((b) => <option key={b.lookup_id} value={b.name} />)}
          </datalist>
          <TextField label='Modelo' {...register('model')} />
          <TextField label='Nº de série / IMEI' {...register('serial')} />
          <TextField label='Acessórios entregues' list='accessories-list' placeholder='carregador, capa...' {...register('accessories')} />
          <datalist id='accessories-list'>
            {accessories.data?.map((a) => <option key={a.lookup_id} value={a.name} />)}
          </datalist>
          <TextField label='Senha / padrão de desbloqueio' autoComplete='off' {...register('device_password')} />
          <TextAreaField
            wrapperClassName='sm:col-span-2'
            label='Estado físico na entrada'
            placeholder='riscos, trincas, amassados...'
            className='min-h-16'
            {...register('condition')}
          />
          <div className='sm:col-span-2 flex flex-col gap-1'>
            <span className='text-xs font-semibold text-zinc-600 dark:text-zinc-400'>Checklist de entrada</span>
            <ChecklistEditor value={checklist} onChange={setChecklist} />
          </div>
          <p className='sm:col-span-2 text-xs text-zinc-500 flex items-center gap-1'>
            <KeyRound size={12} /> A senha do aparelho só aparece para a equipe, nunca na consulta pública.
          </p>
        </div>
      )}

      <Button
        type='submit'
        loading={isPending}
        icon={PenLine}
        className='mx-2 shadow-lg'
      >
        Gerar OS
      </Button>

    </form>
    </FormProvider>


  )
}
